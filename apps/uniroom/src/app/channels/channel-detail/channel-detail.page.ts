import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
export class ChannelDetailPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;

  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private channelService: ChannelService = inject(ChannelService);
  private authService: AuthService = inject(AuthService);
  private alertController: AlertController = inject(AlertController);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private translate: TranslateService = inject(TranslateService);

  private userSubscription?: Subscription;
  private messagesRefreshSubscription?: Subscription;

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

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.messagesRefreshSubscription?.unsubscribe();
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
    } catch (error) {
      console.error('Error loading channel:', error);
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
        this.performScrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_MESSAGES');
      }
    } finally {
      if (!silent) {
        this.isLoadingMessages = false;
      }
    }
  }

  private performScrollToBottom(): void {
    const attemptScroll = (attempt: number = 0): void => {
      if (!this.content) {
        if (attempt < 5) {
          setTimeout((): void => attemptScroll(attempt + 1), 50);
        }
        return;
      }

      this.content
        .scrollToBottom(attempt === 0 ? 300 : 0)
        .then((): void => {
          console.log('Scroll completed successfully');
        })
        .catch((error: any): void => {
          console.warn('Scroll attempt failed:', error);
          if (attempt < 3) {
            setTimeout((): void => attemptScroll(attempt + 1), 100);
          }
        });
    };

    setTimeout((): void => attemptScroll(), 150);
  }

  private groupMessagesByDate(): void {
    const groups: Map<string, ChannelMessage[]> = new Map();

    this.messages.forEach((message: ChannelMessage): void => {
      const date: Date = new Date(message.created_at);
      const dateKey: string = date.toDateString();

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(message);
    });

    this.messageGroups = Array.from(groups.entries()).map(
      ([date, messages]): MessageGroup => ({
        date,
        messages
      })
    );
  }

  async loadMembers(): Promise<void> {
    if (!this.channelId) return;

    try {
      this.members = await this.channelService.getChannelMembers(this.channelId);
    } catch (error) {
      console.error('Error loading members:', error);
      this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_MEMBERS');
    }
  }

  async onSegmentChange(event: any): Promise<void> {
    this.selectedSegment = event.detail.value;
    if (this.selectedSegment === 'members' && this.members.length === 0) {
      await this.loadMembers();
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
    } catch (error) {
      console.error('Error sending message:', error);
      this.notificationService.error('CHANNELS.DETAIL.ERROR.SEND_MESSAGE');
      this.messageContent = content;
    }
  }

  async deleteMessage(message: ChannelMessage): Promise<void> {
    if (!this.canDeleteMessage(message)) return;

    const alert: HTMLIonAlertElement = await this.alertController.create({
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
          handler: async (): Promise<void> => {
            try {
              await this.channelService.deleteChannelMessage(this.channelId, message.id);
              await this.loadMessages(false, false);
              this.notificationService.success('CHANNELS.DETAIL.SUCCESS.DELETE_MESSAGE');
            } catch (error) {
              console.error('Error deleting message:', error);
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
}
