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
      await this.loadMessages(true);
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

  async loadMessages(silent: boolean = false): Promise<void> {
    if (!this.channelId) return;

    try {
      if (!silent) {
        this.isLoadingMessages = true;
      }
      this.messages = await this.channelService.getChannelMessages(this.channelId);
      this.groupMessagesByDate();
      if (!silent) {
        setTimeout((): void => {
          this.scrollToBottom();
        }, 100);
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
      await this.channelService.sendChannelMessage(this.channelId, this.currentUser.id, content);
      await this.loadMessages(false);
    } catch (error) {
      console.error('Error sending message:', error);
      this.notificationService.error('CHANNELS.DETAIL.ERROR.SEND_MESSAGE');
      this.messageContent = content;
    }
  }

  async deleteMessage(message: ChannelMessage): Promise<void> {
    if (message.sender_id !== this.currentUser?.id && this.currentUser?.role !== 'Admin') return;

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
              await this.loadMessages();
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

  private scrollToBottom(): void {
    this.content?.scrollToBottom(300);
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
    return message.sender_id === this.currentUser?.id;
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
      return this.currentUser.avatar_url || this.currentUser.imgUrl || this.defaultUserUrl;
    }
    return message.sender?.avatar_url || message.sender?.imgUrl || this.defaultUserUrl;
  }

  getUserName(message: ChannelMessage): string {
    if (this.isMyMessage(message) && this.currentUser) {
      return this.currentUser.fullName || this.currentUser.name || this.currentUser.username || this.currentUser.id;
    }
    if (message.sender) {
      return message.sender.fullName || message.sender.name || message.sender.username || message.sender_id;
    }
    return message.sender_id;
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
