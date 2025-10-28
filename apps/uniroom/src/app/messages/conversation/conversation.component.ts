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
import { interval, Subject, takeUntil } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import { Conversation, Message } from '../../models/message.types';
import { DEFAULT_USER_URL, User } from '../../models/auth.types';

const ENABLE_MOCK: boolean = true;

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

      if (!ENABLE_MOCK) {
        this.startMessagePolling();
      }
    }

    if (this.isMobile) {
      this.platform.backButton.subscribeWithPriority(10, () => {
        this.onBackClick();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      const newConversationId: string = changes['conversationId'].currentValue;
      if (newConversationId && newConversationId !== changes['conversationId'].previousValue) {
        this.conversationId = newConversationId;
        this.messages = [];
        this.loading = true;
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
    if (ENABLE_MOCK) {
      setTimeout(() => {
        const mockConversations: { [key: string]: { user: User; messages: Message[] } } = {
          '1': {
            user: {
              id: 'user-1',
              username: 'marco.rossi',
              email: 'marco@example.com',
              firstName: 'Marco',
              lastName: 'Rossi',
              role: 'Basic' as const,
              avatar_url: 'https://i.pravatar.cc/150?img=12'
            },
            messages: [
              {
                id: 'msg-1-1',
                conversation_id: '1',
                sender_id: 'user-1',
                content: "Hi! I'm interested in the room you posted. Is it still available?",
                created_at: new Date(Date.now() - 600000).toISOString(),
                updated_at: new Date(Date.now() - 600000).toISOString(),
                is_read: true
              },
              {
                id: 'msg-1-2',
                conversation_id: '1',
                sender_id: 'current-user-id',
                content: "Yes, it's still available! Would you like to schedule a viewing?",
                created_at: new Date(Date.now() - 300000).toISOString(),
                updated_at: new Date(Date.now() - 300000).toISOString(),
                is_read: true
              },
              {
                id: 'msg-1-3',
                conversation_id: '1',
                sender_id: 'user-1',
                content: 'That would be great! When would be a good time?',
                created_at: new Date(Date.now() - 120000).toISOString(),
                updated_at: new Date(Date.now() - 120000).toISOString(),
                is_read: false
              }
            ]
          },
          '2': {
            user: {
              id: 'user-2',
              username: 'sofia.chen',
              email: 'sofia@example.com',
              firstName: 'Sofia',
              lastName: 'Chen',
              role: 'Seller' as const,
              avatar_url: 'https://i.pravatar.cc/150?img=5'
            },
            messages: [
              {
                id: 'msg-2-1',
                conversation_id: '2',
                sender_id: 'current-user-id',
                content: 'Hi Sofia! I saw your listing and I would like to visit the apartment.',
                created_at: new Date(Date.now() - 7200000).toISOString(),
                updated_at: new Date(Date.now() - 7200000).toISOString(),
                is_read: true
              },
              {
                id: 'msg-2-2',
                conversation_id: '2',
                sender_id: 'user-2',
                content: 'That would be great! When would be a good time?',
                created_at: new Date(Date.now() - 3600000).toISOString(),
                updated_at: new Date(Date.now() - 3600000).toISOString(),
                is_read: false
              }
            ]
          },
          '3': {
            user: {
              id: 'user-3',
              username: 'luca.ferrari',
              email: 'luca@example.com',
              firstName: 'Luca',
              lastName: 'Ferrari',
              role: 'Admin' as const,
              avatar_url: 'https://i.pravatar.cc/150?img=8'
            },
            messages: [
              {
                id: 'msg-3-1',
                conversation_id: '3',
                sender_id: 'user-3',
                content: 'Hello! Is the textbook still in good condition?',
                created_at: new Date(Date.now() - 21600000).toISOString(),
                updated_at: new Date(Date.now() - 21600000).toISOString(),
                is_read: true
              },
              {
                id: 'msg-3-2',
                conversation_id: '3',
                sender_id: 'current-user-id',
                content: 'The textbook is in perfect condition!',
                created_at: new Date(Date.now() - 10800000).toISOString(),
                updated_at: new Date(Date.now() - 10800000).toISOString(),
                is_read: true
              }
            ]
          }
        };

        const mockData = mockConversations[this.conversationId];
        if (mockData) {
          this.otherUser = mockData.user;
          this.conversation = {
            id: this.conversationId,
            participant1_id: 'current-user-id',
            participant2_id: mockData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            participant1: this.currentUser!,
            participant2: mockData.user
          };
        }
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
        const mockConversations: { [key: string]: Message[] } = {
          '1': [
            {
              id: 'msg-1-1',
              conversation_id: '1',
              sender_id: 'user-1',
              content: "Hi! I'm interested in the room you posted. Is it still available?",
              created_at: new Date(Date.now() - 600000).toISOString(),
              updated_at: new Date(Date.now() - 600000).toISOString(),
              is_read: true
            },
            {
              id: 'msg-1-2',
              conversation_id: '1',
              sender_id: 'current-user-id',
              content: "Yes, it's still available! Would you like to schedule a viewing?",
              created_at: new Date(Date.now() - 300000).toISOString(),
              updated_at: new Date(Date.now() - 300000).toISOString(),
              is_read: true
            },
            {
              id: 'msg-1-3',
              conversation_id: '1',
              sender_id: 'user-1',
              content: 'That would be great! When would be a good time?',
              created_at: new Date(Date.now() - 120000).toISOString(),
              updated_at: new Date(Date.now() - 120000).toISOString(),
              is_read: false
            }
          ],
          '2': [
            {
              id: 'msg-2-1',
              conversation_id: '2',
              sender_id: 'current-user-id',
              content: 'Hi Sofia! I saw your listing and I would like to visit the apartment.',
              created_at: new Date(Date.now() - 7200000).toISOString(),
              updated_at: new Date(Date.now() - 7200000).toISOString(),
              is_read: true
            },
            {
              id: 'msg-2-2',
              conversation_id: '2',
              sender_id: 'user-2',
              content: 'That would be great! When would be a good time?',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: new Date(Date.now() - 3600000).toISOString(),
              is_read: false
            }
          ],
          '3': [
            {
              id: 'msg-3-1',
              conversation_id: '3',
              sender_id: 'user-3',
              content: 'Hello! Is the textbook still in good condition?',
              created_at: new Date(Date.now() - 21600000).toISOString(),
              updated_at: new Date(Date.now() - 21600000).toISOString(),
              is_read: true
            },
            {
              id: 'msg-3-2',
              conversation_id: '3',
              sender_id: 'current-user-id',
              content: 'The textbook is in perfect condition!',
              created_at: new Date(Date.now() - 10800000).toISOString(),
              updated_at: new Date(Date.now() - 10800000).toISOString(),
              is_read: true
            }
          ]
        };

        this.messages = mockConversations[this.conversationId] || [];
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
