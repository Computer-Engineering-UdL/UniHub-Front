import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import { AuthService } from '../../services/auth.service';
import { Role, User } from '../../models/auth.types';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';

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
  private alertController: AlertController = inject(AlertController);
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);

  users: User[] = [];
  stats: UserStats = { total: 0, active: 0, pending: 0, suspended: 0 };
  loading: boolean = false;
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalUsers: number = 0;
  selectedStatus: string = 'all';
  selectedRole: string = 'all';
  sortField: string = 'joinedDate';
  sortOrder: 'asc' | 'desc' = 'desc';
  selectedUsers: Set<string> = new Set();

  statusOptions = [
    { value: 'all', label: 'ADMIN.USERS.ALL_STATUS' },
    { value: 'active', label: 'USER.STATUS_ACTIVE' },
    { value: 'pending', label: 'USER.STATUS_PENDING' }
  ];

  roleOptions = [
    { value: 'all', label: 'ADMIN.USERS.ALL_ROLES' },
    { value: 'Admin', label: 'ROLE.ADMIN' },
    { value: 'Basic', label: 'ROLE.BASIC' },
    { value: 'Seller', label: 'ROLE.SELLER' }
  ];

  pageSizeOptions = [10, 25, 50, 100];

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
        let filteredUsers = response.map((user: any) => ({
          ...user,
          firstName: user.first_name,
          lastName: user.last_name,
          imgUrl: user.avatar_url,
          avatar_url: user.avatar_url,
          isVerified: user.is_verified ?? false,
          joinedDate: user.joined_date || user.created_at
        }));

        if (this.selectedStatus !== 'all') {
          filteredUsers = filteredUsers.filter((user: User) => {
            if (this.selectedStatus === 'active') {
              return user.isVerified;
            }
            if (this.selectedStatus === 'pending') {
              return !user.isVerified;
            }
            return true;
          });
        }

        if (this.selectedRole !== 'all') {
          filteredUsers = filteredUsers.filter((user: User) => user.role === this.selectedRole);
        }

        this.sortUsers(filteredUsers);
        this.users = filteredUsers;
        this.totalUsers = this.users.length;
        this.calculateStats();
      }
    } catch (error) {
      await this.notificationService.error('ERROR.LOAD_USERS');
    } finally {
      this.loading = false;
    }
  }

  sortUsers(users: User[]): void {
    users.sort((a: User, b: User) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'name':
          aValue = (a.firstName || a.username || '').toLowerCase();
          bValue = (b.firstName || b.username || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'role':
          aValue = (a.role || '').toLowerCase();
          bValue = (b.role || '').toLowerCase();
          break;
        case 'joinedDate':
          aValue = new Date(a.joinedDate || 0).getTime();
          bValue = new Date(b.joinedDate || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
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

  onStatusChange(event: any): void {
    this.selectedStatus = event.detail.value;
    this.currentPage = 0;
    void this.loadUsers();
  }

  onRoleChange(event: any): void {
    this.selectedRole = event.detail.value;
    this.currentPage = 0;
    void this.loadUsers();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = event.detail.value;
    this.currentPage = 0;
    void this.loadUsers();
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.sortUsers(this.users);
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

  async exportUsers(): Promise<void> {
    try {
      const usersToExport =
        this.selectedUsers.size > 0 ? this.users.filter((u) => this.selectedUsers.has(u.username)) : this.users;

      const csv = this.convertToCSV(usersToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await this.notificationService.success('ADMIN.USERS.EXPORT_SUCCESS');
    } catch (error) {
      await this.notificationService.error('ADMIN.USERS.EXPORT_ERROR');
    }
  }

  private convertToCSV(users: User[]): string {
    const headers = [
      'Username',
      'Email',
      'First Name',
      'Last Name',
      'Role',
      'Status',
      'University',
      'Phone',
      'Joined Date'
    ];
    const rows = users.map((user) => [
      user.username || '',
      user.email || '',
      user.firstName || '',
      user.lastName || '',
      user.role || '',
      user.isVerified ? 'Active' : 'Pending',
      user.university || '',
      user.phone || '',
      user.joinedDate || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    return csvContent;
  }

  async deleteUser(user: User): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translateService.instant('ADMIN.USERS.DELETE_CONFIRM_TITLE'),
      message: this.translateService.instant('ADMIN.USERS.DELETE_CONFIRM_MESSAGE', {
        username: user.username
      }),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.confirmDeleteUser(user);
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDeleteUser(user: User): Promise<void> {
    try {
      // Prevent self-deletion
      const currentUser: User | null = this.authService.currentUser;
      if (currentUser && user.id === currentUser.id) {
        await this.notificationService.error('ADMIN.USERS.DELETE_SELF_ERROR');
        return;
      }

      await lastValueFrom(this.apiService.delete(`user/${user.id}`));
      await this.notificationService.success('ADMIN.USERS.DELETE_SUCCESS');
      this.selectedUsers.delete(user.username);
      await this.loadUsers();
    } catch (error) {
      await this.notificationService.error('ADMIN.USERS.DELETE_ERROR');
    }
  }

  async deleteBulkUsers(): Promise<void> {
    if (this.selectedUsers.size === 0) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.translateService.instant('ADMIN.USERS.DELETE_BULK_TITLE'),
      message: this.translateService.instant('ADMIN.USERS.DELETE_BULK_MESSAGE', {
        count: this.selectedUsers.size
      }),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.confirmDeleteBulkUsers();
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDeleteBulkUsers(): Promise<void> {
    try {
      const currentUser = this.authService.currentUser;

      // Filter out selected users and get their IDs, excluding current user
      const usersToDelete = this.users.filter((user) => {
        const isSelected = this.selectedUsers.has(user.username);
        const isCurrentUser = currentUser && user.id === currentUser.id;
        return isSelected && !isCurrentUser;
      });

      // If current user was in selection, show warning
      if (currentUser && this.selectedUsers.has(currentUser.username)) {
        await this.notificationService.warning('ADMIN.USERS.DELETE_SELF_SKIPPED');
      }

      if (usersToDelete.length === 0) {
        await this.notificationService.error('ADMIN.USERS.NO_USERS_TO_DELETE');
        return;
      }

      const deletePromises = usersToDelete.map((user) => lastValueFrom(this.apiService.delete(`user/${user.id}`)));

      await Promise.all(deletePromises);
      await this.notificationService.success('ADMIN.USERS.DELETE_BULK_SUCCESS');
      this.selectedUsers.clear();
      await this.loadUsers();
    } catch (error) {
      await this.notificationService.error('ADMIN.USERS.DELETE_BULK_ERROR');
    }
  }

  toggleUserSelection(username: string): void {
    if (this.selectedUsers.has(username)) {
      this.selectedUsers.delete(username);
    } else {
      this.selectedUsers.add(username);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedUsers.size === this.users.length) {
      this.selectedUsers.clear();
    } else {
      this.users.forEach((user) => this.selectedUsers.add(user.username));
    }
  }

  isUserSelected(username: string): boolean {
    return this.selectedUsers.has(username);
  }

  get allUsersSelected(): boolean {
    return this.users.length > 0 && this.selectedUsers.size === this.users.length;
  }

  formatDate(date: string | undefined): string {
    if (!date) {
      return '—';
    }
    return this.localizationService.formatDate(date);
  }

  getRoleText(role: string): string {
    const key = 'ROLE.' + role.toUpperCase();
    return this.translateService.instant(key);
  }

  getStatusText(user: User): string {
    return user.isVerified
      ? this.translateService.instant('USER.STATUS_ACTIVE')
      : this.translateService.instant('USER.STATUS_PENDING');
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

  getStatusBadgeClass(user: User): string {
    if (user.isVerified) {
      return 'status-active';
    }
    return 'status-pending';
  }

  async onUserMenuClick(user: User, event: Event): Promise<void> {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: user.username,
      buttons: [
        {
          text: this.translateService.instant('ADMIN.USERS.VIEW_DETAILS'),
          handler: () => {
            void this.router.navigate(['/profile', user.username]);
          }
        },
        {
          text: this.translateService.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.deleteUser(user);
          }
        },
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  get hasNextPage(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.totalUsers;
  }

  get hasPrevPage(): boolean {
    return this.currentPage > 0;
  }
}
