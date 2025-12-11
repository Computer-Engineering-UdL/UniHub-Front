import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from '../services/message.service';
import { AuthService } from '../services/auth.service';
import { LocalizationService } from '../services/localization.service';
import { ConversationWithOtherUser } from '../models/message.types';
import { DEFAULT_USER_URL, User } from '../models/auth.types';
import { ConversationComponent } from './conversation/conversation.component';
import { StartConversationModalComponent } from './start-conversation-modal/start-conversation-modal.component';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../shared/shared-module';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, ConversationComponent, SharedModule]
})
export class MessagesPage implements OnInit, OnDestroy {
  private readonly messageService: MessageService = inject(MessageService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroy$: Subject<void> = new Subject<void>();

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
    this.subscribeToConversations();

    const queryId = this.route.snapshot.queryParamMap.get('id');
    if (queryId) {
      this.selectedConversationId = queryId;
    }

    window.addEventListener('resize', (): void => this.checkIfMobile());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', (): void => this.checkIfMobile());
  }

  async openStartConversationModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: StartConversationModalComponent,
      componentProps: {}
    });

    modal.onDidDismiss().then((result) => {
      const createdConversationId = result?.data?.createdConversationId;
      if (createdConversationId) {
        this.selectedConversationId = createdConversationId;
      }
    });

    await modal.present();
  }

  private subscribeToConversations(): void {
    this.messageService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversations: ConversationWithOtherUser[]): void => {
        this.conversations = [...conversations].sort(
          (a: ConversationWithOtherUser, b: ConversationWithOtherUser): number => {
            const dateA: Date = new Date(a.last_message?.created_at || a.updated_at || a.created_at);
            const dateB: Date = new Date(b.last_message?.created_at || b.updated_at || b.created_at);
            return dateB.getTime() - dateA.getTime();
          }
        );

        if (this.searchQuery) {
          this.filterConversations();
        } else {
          this.filteredConversations = this.conversations;
        }
      });
  }

  checkIfMobile(): void {
    this.isMobile = window.innerWidth < 768 || navigator.userAgent.includes('Mobile');
  }

  loadConversations(): void {
    this.loading = true;

    this.messageService
      .getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (): void => {
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

  private filterConversations(): void {
    const query: string = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredConversations = this.conversations;
      return;
    }

    this.filteredConversations = this.conversations.filter((conv: ConversationWithOtherUser): boolean => {
      const otherUser: User | undefined | null = conv.other_user;

      const fullName: string =
        `${otherUser?.firstName || otherUser?.name || ''} ${otherUser?.lastName || ''}`.toLowerCase();
      const username: string = (otherUser?.username || '').toLowerCase();
      const lastMessage: string = (conv.last_message?.content || '').toLowerCase();

      return fullName.includes(query) || username.includes(query) || lastMessage.includes(query);
    });
  }

  onSearchChange(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.filterConversations();
  }

  openConversation(conversation: ConversationWithOtherUser): void {
    this.selectedConversationId = conversation.id;
  }

  onBackFromConversation(): void {
    if (this.isMobile) {
      this.selectedConversationId = null;
    }
  }

  getOfferCoverImage(conversation: ConversationWithOtherUser): string | null {
    if (!conversation.housing_offer?.photos || conversation.housing_offer.photos.length === 0) {
      return null;
    }

    const coverPhoto = conversation.housing_offer.photos.find((photo) => photo.is_primary);
    if (coverPhoto) {
      return coverPhoto.url;
    }

    return conversation.housing_offer.photos[0]?.url || null;
  }

  formatTime(timestamp: string | undefined): string {
    if (!timestamp) {
      return '';
    }
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
