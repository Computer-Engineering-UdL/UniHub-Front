import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { User } from '../../../models/auth.types';
import { UserService } from '../../../services/user.service';
import { ChannelService } from '../../../services/channel.service';
import NotificationService from '../../../services/notification.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-add-member-modal',
  templateUrl: './add-member-modal.component.html',
  styleUrls: ['./add-member-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class AddMemberModalComponent implements OnInit {
  @Input() channelId: string = '';
  @Input() existingMembers: User[] = [];

  private modalController: ModalController = inject(ModalController);
  private userService: UserService = inject(UserService);
  private channelService: ChannelService = inject(ChannelService);
  private notificationService: NotificationService = inject(NotificationService);
  private authService: AuthService = inject(AuthService);

  searchTerm: string = '';
  users: User[] = [];
  isLoading: boolean = false;
  private searchSubject: Subject<string> = new Subject<string>();
  private currentUser: User | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.currentUser = user;
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
          this.notificationService.error('CHANNELS.ADD_MEMBER.ERROR.SEARCH');
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
        this.notificationService.error('CHANNELS.ADD_MEMBER.ERROR.SEARCH');
      }
    });
  }

  private filterUsers(users: User[]): User[] {
    const existingMemberIds: Set<string> = new Set(this.existingMembers.map((member: User): string => member.id));
    return users.filter((user: User): boolean => {
      return user.id !== this.currentUser?.id && !existingMemberIds.has(user.id);
    });
  }

  onSearchChange(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  async addMember(user: User): Promise<void> {
    try {
      await this.channelService.addMember(this.channelId, user.id);
      this.notificationService.success('CHANNELS.ADD_MEMBER.SUCCESS.ADD');
      this.dismiss(true);
    } catch (_) {
      this.notificationService.error('CHANNELS.ADD_MEMBER.ERROR.ADD');
    }
  }

  dismiss(data: boolean = false): void {
    void this.modalController.dismiss(data);
  }
}
