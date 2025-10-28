import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from '../services/message.service';
import { AuthService } from '../services/auth.service';
import { LocalizationService } from '../services/localization.service';
import { ConversationWithOtherUser } from '../models/message.types';
import { DEFAULT_USER_URL, User } from '../models/auth.types';

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
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class MessagesPage implements OnInit, OnDestroy {
  private messageService: MessageService = inject(MessageService);
  private authService: AuthService = inject(AuthService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private router: Router = inject(Router);
  private destroy$: Subject<void> = new Subject<void>();

  conversations: ConversationWithOtherUser[] = [];
  filteredConversations: ConversationWithOtherUser[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  currentUser: User | null = null;

  readonly defaultUserUrl: string = DEFAULT_USER_URL;

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConversations(): void {
    this.loading = true;

    if (ENABLE_MOCK) {
      setTimeout(() => {
        this.conversations = MOCK_CONVERSATIONS;
        this.filteredConversations = this.conversations;
        this.loading = false;
      }, 500);
      return;
    }

    this.messageService
      .getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations: ConversationWithOtherUser[]) => {
          this.conversations = conversations.sort((a, b) => {
            const dateA: Date = new Date(a.last_message?.created_at || a.updated_at);
            const dateB: Date = new Date(b.last_message?.created_at || b.updated_at);
            return dateB.getTime() - dateA.getTime();
          });
          this.filteredConversations = this.conversations;
          this.loading = false;
        },
        error: (error: Error) => {
          console.error('Error loading conversations:', error);
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

    this.filteredConversations = this.conversations.filter((conv: ConversationWithOtherUser) => {
      const otherUser: User = conv.other_user;
      const fullName: string = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.toLowerCase();
      const username: string = (otherUser.username || '').toLowerCase();
      const lastMessage: string = (conv.last_message?.content || '').toLowerCase();

      return fullName.includes(query) || username.includes(query) || lastMessage.includes(query);
    });
  }

  openConversation(conversation: ConversationWithOtherUser): void {
    void this.router.navigate(['/messages/conversation', conversation.id]);
  }

  getUserAvatar(user: User): string {
    return user.avatar_url || user.imgUrl || this.defaultUserUrl;
  }

  getUserInitials(user: User): string {
    const firstName: string = user.firstName || user.name || '';
    const lastName: string = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.username.charAt(0).toUpperCase();
  }

  formatTime(timestamp: string): string {
    const date: Date = new Date(timestamp);
    const now: Date = new Date();
    const diffMs: number = now.getTime() - date.getTime();
    const diffMins: number = Math.floor(diffMs / 60000);
    const diffHours: number = Math.floor(diffMs / 3600000);
    const diffDays: number = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'ara mateix';
    } else if (diffMins < 60) {
      return `fa ${diffMins} min`;
    } else if (diffHours < 24) {
      return `fa ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'ahir';
    } else if (diffDays < 7) {
      return `fa ${diffDays} dies`;
    } else {
      return this.localizationService.formatDate(date, { day: 'numeric', month: 'short' });
    }
  }

  truncateMessage(message: string, maxLength: number = 50): string {
    if (!message) {
      return '';
    }
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  }

  handleRefresh(event: any): void {
    this.loadConversations();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}
