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
import { IonContent, IonicModule, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import { Conversation, Message } from '../../models/message.types';
import { DEFAULT_USER_URL, User } from '../../models/auth.types';

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
  private destroy$: Subject<void> = new Subject<void>();

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
      this.loadConversation();
      this.loadMessages();
      this.subscribeToMessages();
    }

    if (this.isMobile) {
      this.platform.backButton.subscribeWithPriority(10, (): void => {
        this.onBackClick();
      });
    }
  }

  private subscribeToMessages(): void {
    this.messageService.messages$.pipe(takeUntil(this.destroy$)).subscribe((messages: Message[]): void => {
      this.messages = messages.sort((a: Message, b: Message): number => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setTimeout((): void => {
        void this.scrollToBottom();
      }, 100);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      const newConversationId: string = changes['conversationId'].currentValue;
      if (newConversationId && newConversationId !== changes['conversationId'].previousValue) {
        this.conversationId = newConversationId;
        this.messages = [];
        this.loading = true;
        this.messageService.clearMessages();
        this.loadConversation();
        this.loadMessages();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackClick(): void {
    this.backClicked.emit();
  }

  loadConversation(): void {
    this.messageService
      .getConversation(this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversation: Conversation): void => {
          this.conversation = conversation;
          this.otherUser =
            conversation.participant1_id === this.currentUser?.id
              ? conversation.participant2!
              : conversation.participant1!;
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
}
