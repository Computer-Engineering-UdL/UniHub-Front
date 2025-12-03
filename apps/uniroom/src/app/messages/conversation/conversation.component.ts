import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonContent, IonicModule, Platform, PopoverController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import { Conversation, Message } from '../../models/message.types';
import { DEFAULT_USER_URL, User } from '../../models/auth.types';
import NotificationService from '../../services/notification.service';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class ConversationComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild(IonContent) content!: IonContent;

  @Input() conversationId: string = '';
  @Input() isMobile: boolean = false;
  @Output() backClicked: EventEmitter<void> = new EventEmitter<void>();

  private messageService: MessageService = inject(MessageService);
  private authService: AuthService = inject(AuthService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private platform: Platform = inject(Platform);
  private popoverController: PopoverController = inject(PopoverController);
  private alertController: AlertController = inject(AlertController);
  private translate: TranslateService = inject(TranslateService);
  private notificationService: NotificationService = inject(NotificationService);
  private router: Router = inject(Router);
  private destroy$: Subject<void> = new Subject<void>();
  private conversationDestroy$: Subject<void> = new Subject<void>();

  messages: Message[] = [];
  conversation: Conversation | null = null;
  otherUser: User | null = null;
  currentUser: User | null = null;
  newMessage: string = '';
  loading: boolean = true;
  sending: boolean = false;

  readonly defaultUserUrl: string = DEFAULT_USER_URL;

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;

    if (this.conversationId) {
      this.subscribeToMessages();
      this.loadConversation();
      this.loadMessages();
    }

    if (this.isMobile) {
      this.platform.backButton.subscribeWithPriority(10, (): void => {
        this.onBackClick();
      });
    }
  }

  private subscribeToMessages(): void {
    this.messageService.messages$.pipe(takeUntil(this.conversationDestroy$)).subscribe((messages: Message[]): void => {
      this.messages = [...messages];
      setTimeout((): void => {
        void this.scrollToBottom();
      }, 100);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      const newConversationId: string = changes['conversationId'].currentValue;
      if (newConversationId && newConversationId !== changes['conversationId'].previousValue) {
        this.conversationDestroy$.next();
        this.conversationDestroy$ = new Subject<void>();

        this.conversationId = newConversationId;
        this.messages = [];
        this.loading = true;
        this.messageService.clearMessages();
        this.subscribeToMessages();
        this.loadConversation();
        this.loadMessages();
      }
    }
  }

  ngOnDestroy(): void {
    this.conversationDestroy$.next();
    this.conversationDestroy$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackClick(): void {
    this.backClicked.emit();
  }

  loadConversation(): void {
    const conversations = this.messageService.getConversationsValue();
    const foundConversation = conversations.find((c) => c.id === this.conversationId);

    if (foundConversation) {
      this.conversation = foundConversation;
      this.otherUser = foundConversation.other_user || null;
      return;
    }

    this.messageService
      .getConversation(this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversation: Conversation): void => {
          this.conversation = conversation;

          const currentUserId = this.currentUser?.id;
          if (currentUserId) {
            const otherUserId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
            this.otherUser = { id: otherUserId } as User;
          } else {
            this.otherUser = null;
          }
        },
        error: (_): void => {
          this.loading = false;
        }
      });
  }

  loadMessages(): void {
    this.messageService
      .getMessages(this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: Message[]): void => {
          this.loading = false;
          setTimeout((): void => {
            void this.scrollToBottom();
          }, 100);
          this.markConversationAsRead();
        },
        error: (_): void => {
          this.loading = false;
        }
      });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending) {
      return;
    }

    this.sending = true;
    const messageContent: string = this.newMessage.trim();
    this.newMessage = '';

    this.messageService
      .sendMessage(this.conversationId, messageContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (): void => {
          this.sending = false;
          setTimeout((): void => {
            void this.scrollToBottom();
          }, 100);
        },
        error: (_): void => {
          this.newMessage = messageContent;
          this.sending = false;
        }
      });
  }

  markConversationAsRead(): void {
    this.messageService.markAsRead(this.conversationId).pipe(takeUntil(this.destroy$)).subscribe();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      void this.content?.scrollToBottom(300);
    }, 100);
  }

  isMyMessage(message: Message): boolean {
    return message.sender_id === this.currentUser?.id;
  }

  trackByMessageId(_index: number, message: Message): string {
    return message.id;
  }

  getUserAvatar(user: User | undefined): string {
    return user?.avatar_url || user?.imgUrl || this.defaultUserUrl;
  }

  getOtherUserInitials(): string {
    if (!this.otherUser) {
      return '?';
    }
    const firstName: string = this.otherUser.firstName || this.otherUser.name || '';
    const lastName: string = this.otherUser.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatTime(timestamp: string): string {
    const date: Date = new Date(timestamp);
    return this.localizationService.formatDateTime(date, { hour: '2-digit', minute: '2-digit' });
  }

  async showConversationOptions(event: Event): Promise<void> {
    event.stopPropagation();

    const buttons: any[] = [];

    // If there's a housing offer, add option to view it
    if (this.conversation?.housing_offer_id) {
      buttons.push({
        text: this.translate.instant('MESSAGES.VIEW_OFFER'),
        handler: () => {
          void this.viewHousingOffer();
        }
      });
    }

    buttons.push(
      {
        text: this.translate.instant('COMMON.CANCEL'),
        role: 'cancel'
      },
      {
        text: this.translate.instant('MESSAGES.DELETE_CONVERSATION'),
        role: 'destructive',
        handler: () => {
          void this.confirmDeleteConversation();
        }
      }
    );

    const alert = await this.alertController.create({
      header: this.translate.instant('MESSAGES.CONVERSATION_OPTIONS'),
      buttons
    });

    await alert.present();
  }

  async viewHousingOffer(): Promise<void> {
    if (this.conversation?.housing_offer_id) {
      await this.router.navigate(['/rooms/details', this.conversation.housing_offer_id]);
    }
  }

  async confirmDeleteConversation(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('MESSAGES.DELETE_CONVERSATION_CONFIRM_TITLE'),
      message: this.translate.instant('MESSAGES.DELETE_CONVERSATION_CONFIRM_MESSAGE'),
      cssClass: 'custom-delete-alert',
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          cssClass: 'danger-btn',
          handler: () => {
            void this.deleteConversation();
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteConversation(): Promise<void> {
    if (!this.conversationId) {
      return;
    }

    try {
      await firstValueFrom(this.messageService.deleteConversation(this.conversationId));
      this.notificationService.success('MESSAGES.DELETE_CONVERSATION_SUCCESS');
      this.onBackClick();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      this.notificationService.error('MESSAGES.DELETE_CONVERSATION_ERROR');
    }
  }
}
