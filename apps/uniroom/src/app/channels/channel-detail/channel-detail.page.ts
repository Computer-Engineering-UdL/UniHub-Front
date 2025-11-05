import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChildren,
  QueryList
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, interval } from 'rxjs';
import { Channel, ChannelMember, ChannelRole } from '../../models/channel.types';
import { ChannelMessage } from '../../models/message.types';
import { User, Role, DEFAULT_USER_URL } from '../../models/auth.types';
import { ChannelService } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { NgZone } from '@angular/core';

interface MessageGroup {
  date: string;
  messages: ChannelMessage[];
}

@Component({
  selector: 'app-channel-detail',
  templateUrl: './channel-detail.page.html',
  styleUrls: ['./channel-detail.page.scss'],
  standalone: false
})
export class ChannelDetailPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('content', { read: IonContent, static: false }) content?: IonContent;
  @ViewChildren('messageItem') messageItems?: QueryList<ElementRef>;

  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private channelService: ChannelService = inject(ChannelService);
  private authService: AuthService = inject(AuthService);
  private alertController: AlertController = inject(AlertController);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private translate: TranslateService = inject(TranslateService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private zone: NgZone = inject(NgZone);

  private userSubscription?: Subscription;
  private messagesRefreshSubscription?: Subscription;
  private messageItemsChangesSub?: Subscription;

  private shouldScrollToBottom: boolean = false;

  channelId: string = '';
  channel: Channel | null = null;
  messages: ChannelMessage[] = [];
  messageGroups: MessageGroup[] = [];
  members: ChannelMember[] = [];
  currentUser: User | null = null;
  isLoading: boolean = true;
  isLoadingMessages: boolean = false;
  messageContent: string = '';
  selectedSegment: 'messages' | 'members' = 'messages';
  editingMessageId: string | null = null;
  replyingToMessage: ChannelMessage | null = null;

  readonly defaultUserUrl: string = DEFAULT_USER_URL;

  async ngOnInit(): Promise<void> {
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.currentUser = user;
    });

    this.channelId = this.route.snapshot.paramMap.get('id') || '';
    if (this.channelId) {
      await this.loadChannel();
      await this.loadMessages();
      this.startMessagesRefresh();
    }
  }

  ngAfterViewInit(): void {
    if (this.messageItems && this.messageItems.length) {
      void this.queueScrollIfNeeded(true);
    }
    this.messageItemsChangesSub = this.messageItems?.changes.subscribe(() => {
      void this.queueScrollIfNeeded(true);
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.messagesRefreshSubscription?.unsubscribe();
    this.messageItemsChangesSub?.unsubscribe();
  }

  private startMessagesRefresh(): void {
    this.messagesRefreshSubscription = interval(5000).subscribe(async (): Promise<void> => {
      await this.loadMessages(true, false);
    });
  }

  async loadChannel(): Promise<void> {
    try {
      this.isLoading = true;
      this.channel = await this.channelService.fetchChannelById(this.channelId);
    } catch {
      this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_CHANNEL');
      await this.router.navigate(['/channels']);
    } finally {
      this.isLoading = false;
    }
  }

  async loadMessages(silent: boolean = false, scrollToBottom: boolean = true): Promise<void> {
    if (!this.channelId) return;

    try {
      if (!silent) {
        this.isLoadingMessages = true;
      }

      this.messages = await this.channelService.getChannelMessages(this.channelId);
      this.groupMessagesByDate();

      if (scrollToBottom) {
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
        await this.queueScrollIfNeeded();
      }
    } catch {
      if (!silent) {
        this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_MESSAGES');
      }
    } finally {
      if (!silent) {
        this.isLoadingMessages = false;
      }
    }
  }

  private groupMessagesByDate(): void {
    const map = new Map<number, ChannelMessage[]>();
    for (const m of this.messages) {
      const d = new Date(m.created_at);
      const keyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const arr = map.get(keyDate) ?? [];
      arr.push(m);
      map.set(keyDate, arr);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    this.messageGroups = sorted.map(([ts, msgs]) => ({
      date: new Date(ts).toISOString(),
      messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  }

  async loadMembers(): Promise<void> {
    if (!this.channelId) return;

    try {
      this.members = await this.channelService.getChannelMembers(this.channelId);
    } catch {
      this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_MEMBERS');
    }
  }

  async onSegmentChange(event: any): Promise<void> {
    this.selectedSegment = event.detail.value;
    if (this.selectedSegment === 'messages') {
      await this.queueScrollIfNeeded(true);
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.messageContent.trim() || !this.canWriteInChannel() || !this.currentUser) return;

    const content: string = this.messageContent.trim();
    this.messageContent = '';

    try {
      if (this.editingMessageId) {
        await this.channelService.updateChannelMessage(this.channelId, this.editingMessageId, content);
        this.editingMessageId = null;
        this.notificationService.success('CHANNELS.DETAIL.SUCCESS.EDIT_MESSAGE');
      } else if (this.replyingToMessage) {
        await this.channelService.replyToChannelMessage(
          this.channelId,
          this.replyingToMessage.id,
          this.currentUser.id,
          content
        );
        this.replyingToMessage = null;
        this.notificationService.success('CHANNELS.DETAIL.SUCCESS.REPLY_MESSAGE');
      } else {
        await this.channelService.sendChannelMessage(this.channelId, this.currentUser.id, content);
      }
      await this.loadMessages(false, true);
    } catch {
      this.notificationService.error('CHANNELS.DETAIL.ERROR.SEND_MESSAGE');
      this.messageContent = content;
    }
  }

  async deleteMessage(message: ChannelMessage): Promise<void> {
    if (!this.canDeleteMessage(message)) return;

    const alert: HTMLIonAlertElement = await this.alertController.create({
      cssClass: 'custom-delete-alert',
      header: this.translate.instant('CHANNELS.DETAIL.DELETE_MESSAGE'),
      message: this.translate.instant('CHANNELS.DETAIL.DELETE_MESSAGE_CONFIRM'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          cssClass: 'danger-btn',
          handler: async (): Promise<void> => {
            try {
              await this.channelService.deleteChannelMessage(this.channelId, message.id);
              await this.loadMessages(false, false);
              this.notificationService.success('CHANNELS.DETAIL.SUCCESS.DELETE_MESSAGE');
            } catch {
              this.notificationService.error('CHANNELS.DETAIL.ERROR.DELETE_MESSAGE');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  startEditMessage(message: ChannelMessage): void {
    if (!this.isMyMessage(message)) return;
    this.editingMessageId = message.id;
    this.messageContent = message.content;
    this.replyingToMessage = null;
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.messageContent = '';
  }

  startReplyMessage(message: ChannelMessage): void {
    this.replyingToMessage = message;
    this.editingMessageId = null;
    this.messageContent = '';
  }

  cancelReply(): void {
    this.replyingToMessage = null;
    this.messageContent = '';
  }

  scrollToMessage(messageId: string): void {
    const messageElement: HTMLElement | null = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight-message');
      setTimeout((): void => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  }

  getReplyMessageContent(message: ChannelMessage): string {
    if (!message.reply_message) return '';
    return message.reply_message.content.length > 50
      ? message.reply_message.content.substring(0, 50) + '...'
      : message.reply_message.content;
  }

  getReplyMessageSender(message: ChannelMessage): string {
    if (!message.reply_message) return '';
    if (message.reply_message.user_id === this.currentUser?.id) {
      return this.translate.instant('COMMON.YOU');
    }
    if (message.reply_message.sender) {
      return (
        message.reply_message.sender.fullName ||
        message.reply_message.sender.name ||
        message.reply_message.sender.username ||
        message.reply_message.user_id
      );
    }
    return message.reply_message.user_id;
  }

  canWriteInChannel(): boolean {
    if (!this.channel || !this.currentUser) return false;
    return this.hasRequiredRole(this.currentUser.role, this.channel.required_role_write);
  }

  private hasRequiredRole(userRole: Role, requiredRole: ChannelRole): boolean {
    const roleHierarchy: Record<Role, number> = {
      Basic: 1,
      Seller: 2,
      Admin: 3
    };

    const requiredRoleMapping: Record<ChannelRole, Role> = {
      Basic: 'Basic',
      Seller: 'Seller',
      Admin: 'Admin'
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRoleMapping[requiredRole]];
  }

  isMyMessage(message: ChannelMessage): boolean {
    return message.user_id === this.currentUser?.id || message.sender_id === this.currentUser?.id;
  }

  canDeleteMessage(message: ChannelMessage): boolean {
    return this.isMyMessage(message) || this.currentUser?.role === 'Admin';
  }

  formatMessageTime(date: string): string {
    const messageDate: Date = new Date(date);
    return this.localizationService.formatDateTime(messageDate, { hour: '2-digit', minute: '2-digit' });
  }

  formatDateSeparator(dateString: string): string {
    const date: Date = new Date(dateString);
    const today: Date = new Date();
    const yesterday: Date = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return this.translate.instant('TIME.TODAY');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return this.translate.instant('TIME.YESTERDAY');
    }

    return this.localizationService.formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getUserAvatar(message: ChannelMessage): string {
    if (this.isMyMessage(message) && this.currentUser) {
      return this.currentUser.imgUrl || this.defaultUserUrl;
    }
    return message.sender?.imgUrl || this.defaultUserUrl;
  }

  getUserName(message: ChannelMessage): string {
    if (this.isMyMessage(message) && this.currentUser) {
      return this.currentUser.fullName || this.currentUser.name || this.currentUser.username || this.currentUser.id;
    }
    if (message.sender) {
      return message.sender.fullName || message.sender.name || message.sender.username || message.user_id;
    }
    return message.user_id;
  }

  getRoleTranslationKey(role: string): string {
    const roleMap: Record<string, string> = {
      member: 'CHANNELS.DETAIL.MEMBER',
      moderator: 'CHANNELS.DETAIL.MODERATOR',
      admin: 'CHANNELS.DETAIL.ADMIN'
    };
    return roleMap[role] || 'CHANNELS.DETAIL.MEMBER';
  }

  getCategoryTranslation(category: string): string {
    return `CHANNELS.${category.toUpperCase()}`;
  }

  trackByMessage(index: number, message: ChannelMessage): string {
    return message.id;
  }

  private async onStableOnce(): Promise<void> {
    return new Promise((resolve) => {
      const sub = this.zone.onStable.subscribe(() => {
        sub.unsubscribe();
        resolve();
      });
    });
  }

  private getScrollHostEl(): HTMLElement | null {
    const list = document.querySelector('.messages-list') as HTMLElement | null;
    if (list) return list;
    const container = document.querySelector('.channel-detail-container') as HTMLElement | null;
    if (container) return container;
    return null;
  }

  private async queueScrollIfNeeded(force: boolean = false): Promise<void> {
    if (!force && !this.shouldScrollToBottom) return;

    await this.onStableOnce();

    await new Promise<void>((r) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => r());
      } else {
        setTimeout(r, 0);
      }
    });

    await new Promise<void>((r) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => r());
      } else {
        setTimeout(r, 0);
      }
    });

    let scrolled = false;
    const host = this.getScrollHostEl();
    if (host) {
      scrolled = await this.forceScrollOnElement(host, 10);
    } else if (this.content) {
      scrolled = await this.forceScrollWithIonContent(6);
    }

    if (!scrolled) {
      const last = this.messageItems?.last?.nativeElement as HTMLElement | undefined;
      if (last) last.scrollIntoView({ behavior: 'auto', block: 'end' });
    }

    this.shouldScrollToBottom = false;
  }

  private async forceScrollOnElement(el: HTMLElement, retries: number = 4): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      if (atBottom) return true;
      await new Promise((r) => setTimeout(r, 0));
    }
    return false;
  }

  private async forceScrollWithIonContent(retries: number = 3): Promise<boolean> {
    if (!this.content) return false;
    for (let i = 0; i < retries; i++) {
      const el = await this.content.getScrollElement();
      await this.content.scrollToPoint(0, el.scrollHeight, 0);
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      if (atBottom) return true;
      await new Promise((r) => setTimeout(r, 0));
    }
    return false;
  }
}
