import { Component, ElementRef, inject, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { Channel, ChannelMember, ChannelRole } from '../../models/channel.types';
import { ChannelMessage } from '../../models/message.types';
import { DEFAULT_USER_URL, Role, User } from '../../models/auth.types';
import { ChannelService } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { ApiService } from '../../services/api.service';
import { MemberActionsComponent } from './member-actions/member-actions.component';
import { BanMemberModalComponent } from './ban-member-modal/ban-member-modal.component';

interface MemberAction {
  icon: string;
  text: string;
  handler: () => void;
  isDestructive?: boolean;
  isSelected?: boolean;
}

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
  @ViewChildren('messageItem') messageItems?: QueryList<ElementRef>;

  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private channelService: ChannelService = inject(ChannelService);
  private authService: AuthService = inject(AuthService);
  private apiService: ApiService = inject(ApiService);
  private alertController: AlertController = inject(AlertController);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private translate: TranslateService = inject(TranslateService);
  private modalController: ModalController = inject(ModalController);
  private popoverCtrl: PopoverController = inject(PopoverController);

  private userSubscription?: Subscription;
  private messagesRefreshSubscription?: Subscription;

  channelId: string = '';
  channel: Channel | null = null;
  messages: ChannelMessage[] = [];
  messageGroups: MessageGroup[] = [];
  members: ChannelMember[] = [];
  adminMembers: ChannelMember[] = [];
  moderatorMembers: ChannelMember[] = [];
  bannedMembers: ChannelMember[] = [];
  regularMembers: ChannelMember[] = [];
  currentUser: User | null = null;
  isLoading: boolean = true;
  isLoadingMessages: boolean = false;
  messageContent: string = '';
  editingMessageId: string | null = null;
  replyingToMessage: ChannelMessage | null = null;
  showMembersModal: boolean = false;

  readonly defaultUserUrl: string = DEFAULT_USER_URL;

  async ngOnInit(): Promise<void> {
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.currentUser = user;
    });

    this.channelId = this.route.snapshot.paramMap.get('id') || '';
    if (this.channelId) {
      await this.loadChannel();
      await this.loadMessages();
      await this.loadMembers();
      this.startMessagesRefresh();
    }
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.messagesRefreshSubscription?.unsubscribe();
  }

  goBack(): void {
    void this.router.navigate(['/channels']);
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
    if (!this.channelId) {
      return;
    }
    try {
      if (!silent) {
        this.isLoadingMessages = true;
      }
      this.messages = await this.channelService.getChannelMessages(this.channelId);
      this.groupMessagesByDate();
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
    const sorted = Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
    this.messageGroups = sorted.map(([ts, msgs]) => ({
      date: new Date(ts).toISOString(),
      messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  }

  async loadMembers(): Promise<void> {
    if (!this.channelId) {
      return;
    }
    try {
      const membersData: ChannelMember[] = await this.channelService.getChannelMembers(this.channelId);

      const allMembers: ChannelMember[] = await Promise.all(
        membersData.map(async (member: ChannelMember): Promise<ChannelMember> => {
          try {
            const user: User = this.authService.mapUserFromApi(
              await firstValueFrom(this.apiService.get<User>(`user/public/${member.user_id}`))
            );
            return { ...member, user };
          } catch (_) {
            return member;
          }
        })
      );

      this.members = allMembers.filter((member: ChannelMember): boolean => !member.is_banned);
      this.bannedMembers = allMembers.filter((member: ChannelMember): boolean => !!member.is_banned);

      this.adminMembers = this.members.filter((member: ChannelMember): boolean => member.role === 'admin');
      this.moderatorMembers = this.members.filter((member: ChannelMember): boolean => member.role === 'moderator');
      this.regularMembers = this.members.filter((member: ChannelMember): boolean => member.role === 'user');
    } catch {
      this.notificationService.error('CHANNELS.DETAIL.ERROR.LOAD_MEMBERS');
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.messageContent.trim() || !this.canWriteInChannel() || !this.currentUser) {
      return;
    }
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
    if (!this.canDeleteMessage(message)) {
      return;
    }
    const alert: HTMLIonAlertElement = await this.alertController.create({
      cssClass: 'custom-delete-alert',
      header: this.translate.instant('CHANNELS.DETAIL.DELETE_MESSAGE'),
      message: this.translate.instant('CHANNELS.DETAIL.DELETE_MESSAGE_CONFIRM'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
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
    if (!this.isMyMessage(message)) {
      return;
    }
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
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      el.classList.add('highlight-message');
      setTimeout(() => el.classList.remove('highlight-message'), 2000);
    }
  }

  getReplyMessageContent(message: ChannelMessage): string {
    if (!message.parent_message) {
      return '';
    }
    return message.parent_message.content.length > 50
      ? message.parent_message.content.substring(0, 50) + '...'
      : message.parent_message.content;
  }

  getReplyMessageSender(message: ChannelMessage): string {
    if (!message.parent_message) {
      return '';
    }
    if (message.parent_message.user_id === this.currentUser?.id) {
      return this.translate.instant('COMMON.YOU');
    }
    if (message.parent_message.sender) {
      return (
        message.parent_message.sender.fullName ||
        message.parent_message.sender.name ||
        message.parent_message.sender.username ||
        message.parent_message.user_id
      );
    }
    return message.parent_message.user_id;
  }

  canWriteInChannel(): boolean {
    if (!this.channel || !this.currentUser) {
      return false;
    }
    return this.hasRequiredRole(this.currentUser.role, this.channel.required_role_write);
  }

  private getCurrentMember(): ChannelMember | undefined {
    return this.members.find((m): boolean => m.user_id === this.currentUser?.id);
  }

  private hasRequiredRole(userRole: Role, requiredRole: ChannelRole): boolean {
    const roleHierarchy: Record<Role, number> = { Basic: 1, Seller: 2, Admin: 3 };
    const requiredRoleMapping: Record<ChannelRole, Role> = { Basic: 'Basic', Seller: 'Seller', Admin: 'Admin' };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRoleMapping[requiredRole]];
  }

  isMyMessage(message: ChannelMessage): boolean {
    return message.user_id === this.currentUser?.id || message.sender_id === this.currentUser?.id;
  }

  canDeleteMessage(message: ChannelMessage): boolean {
    if (this.isMyMessage(message)) {
      return true;
    }
    if (this.currentUser?.role === 'Admin') {
      return true;
    }
    const member = this.getCurrentMember();
    return member?.role === 'admin' || member?.role === 'moderator';
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
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return this.translate.instant('TIME.YESTERDAY');
    }
    return this.localizationService.formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getUserAvatar(message: ChannelMessage): string {
    return message.sender?.avatar_url || this.defaultUserUrl;
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
      admin: 'CHANNELS.DETAIL.ADMIN',
      user: 'CHANNELS.DETAIL.MEMBER'
    };
    return roleMap[role] || 'CHANNELS.DETAIL.MEMBER';
  }

  getCategoryTranslation(category: string): string {
    return `CHANNELS.${category.toUpperCase()}`;
  }

  trackByMessage(index: number, message: ChannelMessage): string {
    return message.id;
  }

  openMembersModal(): void {
    this.showMembersModal = true;
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
  }

  isCurrentUserChannelAdmin(): boolean {
    const member = this.getCurrentMember();
    return member?.role === 'admin';
  }

  canManageMembers(): boolean {
    const member = this.getCurrentMember();
    return member?.role === 'admin' || member?.role === 'moderator';
  }

  isAdmin(): boolean {
    const member = this.getCurrentMember();
    return member?.user?.role === 'Admin';
  }

  async openAddMemberModal() {
    const { AddMemberModalComponent } = await import('./add-member-modal/add-member-modal.component');
    const modal = await this.modalController.create({
      component: AddMemberModalComponent,
      componentProps: {
        channelId: this.channelId,
        existingMembers: this.members.map((m) => m.user).filter(Boolean) as User[],
        bannedMemberIds: this.bannedMembers.map((m) => m.user_id)
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      await this.loadMembers();
    }
  }

  async presentMemberActionSheet(event: Event, member: ChannelMember) {
    event.stopPropagation();

    const currentMember = this.getCurrentMember();
    const isChannelAdmin = currentMember?.role === 'admin';
    const isChannelModerator = currentMember?.role === 'moderator';
    const canManageMembers = isChannelAdmin || isChannelModerator;

    if (!canManageMembers) {
      return;
    }

    const allActions: MemberAction[] = [];

    if (isChannelAdmin) {
      allActions.push(
        {
          icon: 'shield-checkmark',
          text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.SET_ADMIN'),
          handler: () => {
            this.setMemberRole(member, 'admin');
          },
          isSelected: member.role === 'admin'
        },
        {
          icon: 'star',
          text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.SET_MODERATOR'),
          handler: () => {
            this.setMemberRole(member, 'moderator');
          },
          isSelected: member.role === 'moderator'
        },
        {
          icon: 'people',
          text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.SET_USER'),
          handler: () => {
            this.setMemberRole(member, 'user');
          },
          isSelected: member.role === 'user' || member.role === 'member'
        }
      );
    }

    allActions.push(
      {
        icon: 'exit-outline',
        text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.KICK'),
        handler: () => {
          this.kickMember(member);
        },
        isDestructive: true
      },
      {
        icon: 'ban-outline',
        text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.BAN'),
        handler: () => {
          this.banMember(member);
        },
        isDestructive: true
      }
    );

    const actions: MemberAction[] = allActions.filter((action: MemberAction): boolean => !action.isSelected);

    const { MemberActionsComponent } = await import('./member-actions/member-actions.component');
    const popover = await this.popoverCtrl.create({
      component: MemberActionsComponent,
      componentProps: {
        member,
        actions
      },
      event,
      translucent: true
    });

    await popover.present();
  }

  async setMemberRole(member: ChannelMember, role: 'admin' | 'moderator' | 'user') {
    try {
      await this.channelService.setMemberRole(this.channelId, member.user_id, role);
      this.notificationService.success('CHANNELS.MEMBER_ACTIONS.SUCCESS.SET_ROLE');
      await this.loadMembers();
    } catch (error) {
      this.notificationService.error('CHANNELS.MEMBER_ACTIONS.ERROR.SET_ROLE');
    }
  }

  async kickMember(member: ChannelMember) {
    const alert = await this.alertController.create({
      header: this.translate.instant('CHANNELS.MEMBER_ACTIONS.KICK_CONFIRM_TITLE'),
      message: this.translate.instant('CHANNELS.MEMBER_ACTIONS.KICK_CONFIRM_MESSAGE', {
        user: member.user?.fullName || member.user?.username
      }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.KICK'),
          handler: async () => {
            try {
              await this.channelService.removeMember(this.channelId, member.user_id);
              this.notificationService.success('CHANNELS.MEMBER_ACTIONS.SUCCESS.KICK');
              await this.loadMembers();
            } catch (error) {
              this.notificationService.error('CHANNELS.MEMBER_ACTIONS.ERROR.KICK');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async banMember(member: ChannelMember) {
    await this.openBanModal(member);
  }

  async openBanModal(member: ChannelMember) {
    const modal = await this.modalController.create({
      component: BanMemberModalComponent,
      componentProps: {
        member
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data?.confirmed) {
      try {
        await this.channelService.banMember(this.channelId, {
          user_id: member.user_id,
          motive: data.motive,
          duration_days: data.duration_days
        });
        this.notificationService.success('CHANNELS.MEMBER_ACTIONS.SUCCESS.BAN');
        await this.loadMembers();
      } catch (_) {
        this.notificationService.error('CHANNELS.MEMBER_ACTIONS.ERROR.BAN');
      }
    }
  }

  async unbanMember(member: ChannelMember) {
    const alert = await this.alertController.create({
      header: this.translate.instant('CHANNELS.MEMBER_ACTIONS.UNBAN_CONFIRM_TITLE'),
      message: this.translate.instant('CHANNELS.MEMBER_ACTIONS.UNBAN_CONFIRM_MESSAGE', {
        user: member.user?.fullName || member.user?.username
      }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('CHANNELS.MEMBER_ACTIONS.UNBAN'),
          handler: async () => {
            try {
              await this.channelService.unbanMember(this.channelId, {
                user_id: member.user_id,
                motive: 'Unbanned by administrator'
              });
              this.notificationService.success('CHANNELS.MEMBER_ACTIONS.SUCCESS.UNBAN');
              await this.loadMembers();
            } catch (_) {
              this.notificationService.error('CHANNELS.MEMBER_ACTIONS.ERROR.UNBAN');
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
