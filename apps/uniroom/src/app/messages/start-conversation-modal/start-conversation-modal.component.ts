import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { User } from '../../models/auth.types';

@Component({
  selector: 'app-start-conversation-modal',
  templateUrl: './start-conversation-modal.component.html',
  styleUrls: ['./start-conversation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class StartConversationModalComponent implements OnInit {
  private readonly modalController: ModalController = inject(ModalController);
  private readonly userService: UserService = inject(UserService);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  searchTerm: string = '';
  users: User[] = [];
  isLoading: boolean = false;
  private readonly searchSubject: Subject<string> = new Subject<string>();
  private currentUser: User | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u) => {
      this.currentUser = u;
      this.loadInitialUsers();
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          this.isLoading = true;
          if (term.length < 2) {
            return this.userService.getUsers();
          }
          return this.userService.searchUsers(term);
        })
      )
      .subscribe({
        next: (users: User[]) => {
          this.users = this.filterUsers(users);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('MESSAGES.START_CONVERSATION.ERROR_SEARCH');
        }
      });
  }

  loadInitialUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        this.users = this.filterUsers(users);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.error('MESSAGES.START_CONVERSATION.ERROR_SEARCH');
      }
    });
  }

  private filterUsers(users: User[]): User[] {
    const existingConversations = this.messageService.getConversationsValue();
    const existingUserIds = new Set(
      existingConversations.map((conv) => {
        return conv.user1_id === this.currentUser?.id ? conv.user2_id : conv.user1_id;
      })
    );

    return users.filter(
      (user: User) => user.isActive !== false && user.id !== this.currentUser?.id && !existingUserIds.has(user.id)
    );
  }

  onSearchChange(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  async startConversation(user: User): Promise<void> {
    try {
      this.isLoading = true;
      const conv = await firstValueFrom(this.messageService.createConversation(user.id));
      this.isLoading = false;
      if (conv?.id) {
        await this.modalController.dismiss({ createdConversationId: conv.id });
        return;
      }
      this.notificationService.error('MESSAGES.START_CONVERSATION.ERROR_CREATE');
    } catch {
      this.isLoading = false;
      this.notificationService.error('MESSAGES.START_CONVERSATION.ERROR_CREATE');
    }
  }

  dismiss(): void {
    this.modalController.dismiss();
  }
}
