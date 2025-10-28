import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from '../services/message.service';
import { AuthService } from '../services/auth.service';
import { LocalizationService } from '../services/localization.service';
import { ConversationWithOtherUser } from '../models/message.types';
import { DEFAULT_USER_URL, User } from '../models/auth.types';
import { ConversationComponent } from './conversation/conversation.component';

const ENABLE_MOCK: boolean = true;
const MOCK_CONVERSATIONS: ConversationWithOtherUser[] = [
  {
    id: '1',
    participant1_id: 'current-user-id',
    participant2_id: 'user-1',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
    other_user: {
      id: 'user-1',
      username: 'marco.rossi',
      email: 'marco@example.com',
      firstName: 'Marco',
      lastName: 'Rossi',
      role: 'Basic' as const,
      avatar_url: 'https://i.pravatar.cc/150?img=12'
    },
    last_message: {
      id: 'msg-1',
      conversation_id: '1',
      sender_id: 'current-user-id',
      content: 'Is the room still available?',
      created_at: new Date(Date.now() - 120000).toISOString(),
      updated_at: new Date(Date.now() - 120000).toISOString(),
      is_read: true
    },
    unread_count: 2
  },
  {
    id: '2',
    participant1_id: 'current-user-id',
    participant2_id: 'user-2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    other_user: {
      id: 'user-2',
      username: 'sofia.chen',
      email: 'sofia@example.com',
      firstName: 'Sofia',
      lastName: 'Chen',
      role: 'Seller' as const,
      avatar_url: 'https://i.pravatar.cc/150?img=5'
    },
    last_message: {
      id: 'msg-2',
      conversation_id: '2',
      sender_id: 'user-2',
      content: 'That would be great! When would be a good time?',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      is_read: false
    },
    unread_count: 0
  },
  {
    id: '3',
    participant1_id: 'current-user-id',
    participant2_id: 'user-3',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    other_user: {
      id: 'user-3',
      username: 'luca.ferrari',
      email: 'luca@example.com',
      firstName: 'Luca',
      lastName: 'Ferrari',
      role: 'Admin' as const,
      avatar_url: 'https://i.pravatar.cc/150?img=8'
    },
    last_message: {
      id: 'msg-3',
      conversation_id: '3',
      sender_id: 'current-user-id',
      content: 'The textbook is in perfect condition!',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 10800000).toISOString(),
      is_read: true
    },
    unread_count: 1
  }
];

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, ConversationComponent]
})
export class MessagesPage implements OnInit, OnDestroy {
  private messageService: MessageService = inject(MessageService);
  private authService: AuthService = inject(AuthService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private destroy$: Subject<void> = new Subject<void>();

  conversations: ConversationWithOtherUser[] = [];
  filteredConversations: ConversationWithOtherUser[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  currentUser: User | null = null;
  selectedConversationId: string | null = null;
  isMobile: boolean = false;

  readonly defaultUserUrl: string = DEFAULT_USER_URL;

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.checkIfMobile();
    this.loadConversations();

    window.addEventListener('resize', () => this.checkIfMobile());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', (): void => this.checkIfMobile());
  }

  checkIfMobile(): void {
    this.isMobile = window.innerWidth < 768 || navigator.userAgent.includes('Mobile');
  }

  loadConversations(): void {
    this.loading = true;

    if (ENABLE_MOCK) {
      setTimeout((): void => {
        this.conversations = MOCK_CONVERSATIONS;
        this.filteredConversations = this.conversations;
        this.loading = false;

        if (!this.isMobile && this.filteredConversations.length > 0) {
          this.selectedConversationId = this.filteredConversations[0].id;
        }
      }, 500);
      return;
    }

    this.messageService
      .getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations: ConversationWithOtherUser[]): void => {
          this.conversations = conversations.sort((a, b): number => {
            const dateA: Date = new Date(a.last_message?.created_at || a.updated_at);
            const dateB: Date = new Date(b.last_message?.created_at || b.updated_at);
            return dateB.getTime() - dateA.getTime();
          });
          this.filteredConversations = this.conversations;
          this.loading = false;

          if (!this.isMobile && this.filteredConversations.length > 0) {
            this.selectedConversationId = this.filteredConversations[0].id;
          }
        },
        error: (_): void => {
          this.loading = false;
        }
      });
  }

  onSearchChange(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const query: string = target.value.toLowerCase().trim();
    this.searchQuery = query;

    if (!query) {
      this.filteredConversations = this.conversations;
      return;
    }

    this.filteredConversations = this.conversations.filter((conv: ConversationWithOtherUser): boolean => {
      const otherUser: User = conv.other_user;
      const fullName: string = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.toLowerCase();
      const username: string = (otherUser.username || '').toLowerCase();
      const lastMessage: string = (conv.last_message?.content || '').toLowerCase();

      return fullName.includes(query) || username.includes(query) || lastMessage.includes(query);
    });
  }

  openConversation(conversation: ConversationWithOtherUser): void {
    this.selectedConversationId = conversation.id;
  }

  onBackFromConversation(): void {
    if (this.isMobile) {
      this.selectedConversationId = null;
    }
  }

  getUserAvatar(user: User): string {
    return user.avatar_url || user.imgUrl || this.defaultUserUrl;
  }

  formatTime(timestamp: string): string {
    return this.localizationService.formatRelativeTime(timestamp);
  }

  truncateMessage(message: string, maxLength: number = 50): string {
    if (!message) {
      return '';
    }
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  }

  handleRefresh(event: any): void {
    this.loadConversations();
    setTimeout((): void => {
      event.target.complete();
    }, 1000);
  }
}
