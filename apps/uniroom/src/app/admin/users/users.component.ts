import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import { Role, User } from '../../models/auth.types';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

interface UserStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: false
})
export class AdminUsersComponent implements OnInit {
  private apiService: ApiService = inject(ApiService);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private translateService: TranslateService = inject(TranslateService);

  users: User[] = [];
  stats: UserStats = { total: 0, active: 0, pending: 0, suspended: 0 };
  loading: boolean = false;
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalUsers: number = 0;

  private searchSubject: Subject<string> = new Subject<string>();

  async ngOnInit(): Promise<void> {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(async (term: string): Promise<void> => {
        this.searchTerm = term;
        this.currentPage = 0;
        await this.loadUsers();
      });

    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    try {
      const params: Record<string, any> = {
        skip: this.currentPage * this.pageSize,
        limit: this.pageSize
      };

      if (this.searchTerm) {
        params['search'] = this.searchTerm;
      }

      const response: any = await lastValueFrom(this.apiService.get<any>('user/', params));

      if (response && Array.isArray(response)) {
        this.users = response.map((user: any) => ({
          ...user,
          firstName: user.first_name,
          lastName: user.last_name,
          imgUrl: user.avatar_url,
          avatar_url: user.avatar_url,
          isVerified: user.is_verified ?? false,
          joinedDate: user.joined_date || user.created_at
        }));
        this.totalUsers = this.users.length;
        this.calculateStats();
      }
    } catch (error) {
      await this.notificationService.error('ERROR.LOAD_USERS');
    } finally {
      this.loading = false;
    }
  }

  calculateStats(): void {
    this.stats.total = this.totalUsers;
    this.stats.active = this.users.filter((u) => u.isVerified).length;
    this.stats.pending = this.users.filter((u) => !u.isVerified).length;
    this.stats.suspended = 0;
  }

  onSearchInput(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  nextPage(): void {
    if ((this.currentPage + 1) * this.pageSize < this.totalUsers) {
      this.currentPage++;
      void this.loadUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      void this.loadUsers();
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) {
      return '—';
    }
    return this.localizationService.formatDate(date);
  }

  getTimeAgo(date: string | undefined): string {
    if (!date) {
      return '—';
    }
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return this.translateService.instant('TIME_AGO.TODAY');
    }
    if (diffDays === 1) {
      return this.translateService.instant('TIME_AGO.ONE_DAY');
    }
    if (diffDays < 7) {
      return this.translateService.instant('TIME_AGO.DAYS', { count: diffDays });
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return this.translateService.instant('TIME_AGO.WEEKS', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return this.translateService.instant('TIME_AGO.MONTHS', { count: months });
  }

  getUserAvatar(user: User): string {
    if (user.avatar_url) {
      return user.avatar_url;
    }
    if (user.imgUrl) {
      return user.imgUrl;
    }
    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    const name =
      firstName || lastName
        ? encodeURIComponent((firstName + ' ' + lastName).trim())
        : encodeURIComponent(user.username || 'user');
    return `https://avatar.iran.liara.run/username?username=${name}`;
  }

  getInitials(user: User): string {
    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  getRoleBadgeClass(role: Role): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'role-admin';
      case 'seller':
        return 'role-seller';
      case 'basic':
      default:
        return 'role-student';
    }
  }

  onUserMenuClick(user: User, event: Event): void {
    event.stopPropagation();
  }

  get hasNextPage(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.totalUsers;
  }

  get hasPrevPage(): boolean {
    return this.currentPage > 0;
  }
}
