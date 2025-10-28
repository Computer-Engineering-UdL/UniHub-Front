import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonContent } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import { Message, Conversation } from '../../models/message.types';
import { User, DEFAULT_USER_URL } from '../../models/auth.types';

const ENABLE_MOCK: boolean = true;
const MOCK_CONVERSATION: Conversation = {
  id: '1',
  participant1_id: 'current-user-id',
  participant2_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  participant1: {
    id: 'current-user-id',
    username: 'current.user',
    email: 'current@example.com',
    firstName: 'Current',
    lastName: 'User',
    role: 'Basic' as const
  },
  participant2: {
    id: 'user-1',
    username: 'marco.rossi',
    email: 'marco@example.com',
    firstName: 'Marco',
    lastName: 'Rossi',
    role: 'Basic' as const,
    avatar_url: 'https://i.pravatar.cc/150?img=12'
  }
};

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    conversation_id: '1',
    sender_id: 'user-1',
    content: "Hi! I'm interested in the room you posted. Is it still available?",
    created_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    is_read: true
  },
  {
    id: 'msg-2',
    conversation_id: '1',
    sender_id: 'current-user-id',
    content: "Yes, it's still available! Would you like to schedule a viewing?",
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString(),
    is_read: true
  },
  {
    id: 'msg-3',
    conversation_id: '1',
    sender_id: 'user-1',
    content: 'That would be great! When would be a good time?',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
    is_read: false
  }
];

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class ConversationComponent implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  private messageService: MessageService = inject(MessageService);
  private authService: AuthService = inject(AuthService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private destroy$: Subject<void> = new Subject<void>();

  conversationId: string = '';
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
    this.conversationId = this.route.snapshot.paramMap.get('id') || '';

    if (this.conversationId) {
      this.loadConversation();
      this.loadMessages();

      if (!ENABLE_MOCK) {
        this.startMessagePolling();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConversation(): void {
    if (ENABLE_MOCK) {
      setTimeout(() => {
        this.conversation = MOCK_CONVERSATION;
        this.otherUser = MOCK_CONVERSATION.participant2!;
      }, 300);
      return;
    }

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
        error: (error: Error) => {
          console.error('Error loading conversation:', error);
        }
      });
  }

  loadMessages(): void {
    if (ENABLE_MOCK) {
      setTimeout(() => {
        this.messages = MOCK_MESSAGES;
        this.loading = false;
        this.scrollToBottom();
      }, 500);
      return;
    }

    this.messageService
      .getMessages(this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: Message[]): void => {
          this.messages = messages;
          this.loading = false;
          this.scrollToBottom();
          this.markMessagesAsRead();
        },
        error: (error: Error) => {
          console.error('Error loading messages:', error);
          this.loading = false;
        }
      });
  }

  startMessagePolling(): void {
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMessages();
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
      .sendMessage({
        conversation_id: this.conversationId,
        content: messageContent
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message: Message) => {
          this.messages.push(message);
          this.sending = false;
          this.scrollToBottom();
        },
        error: (error: Error) => {
          console.error('Error sending message:', error);
          this.newMessage = messageContent;
          this.sending = false;
        }
      });
  }

  markMessagesAsRead(): void {
    const unreadMessages: Message[] = this.messages.filter(
      (msg: Message) => !msg.is_read && msg.sender_id !== this.currentUser?.id
    );

    unreadMessages.forEach((msg: Message) => {
      this.messageService.markAsRead(msg.id).subscribe();
    });
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
