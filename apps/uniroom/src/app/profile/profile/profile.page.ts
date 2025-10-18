import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DEFAULT_USER_URL, Interest, Role, User } from '../../models/auth.types';
import { ModalController } from '@ionic/angular';
import { ProfileEditModal } from '../profile-edit.modal';
import { Subscription } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';

interface ProfileStats {
  posts: number;
  listings: number;
  helpful: number;
  channels: number;
}

interface RecentActivity {
  type: 'post' | 'listing' | 'verification';
  translationKey: string;
  daysAgo: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {
  user: User | null = null;
  selectedTab: 'overview' | 'posts' | 'listings' = 'overview';

  avatarSrc: string = DEFAULT_USER_URL;

  stats: ProfileStats = {
    posts: 12,
    listings: 3,
    helpful: 45,
    channels: 8
  };

  availableInterests: Interest[] = [];
  userInterests: Interest[] = [];

  loadingInterests: boolean = false;

  recentActivity: RecentActivity[] = [
    { type: 'post', translationKey: 'PROFILE.RECENT_ACTIVITY.POSTED_IN', daysAgo: 2 },
    { type: 'listing', translationKey: 'PROFILE.RECENT_ACTIVITY.UPDATED_LISTING', daysAgo: 5 },
    { type: 'verification', translationKey: 'PROFILE.RECENT_ACTIVITY.EMAIL_VERIFIED', daysAgo: 7 }
  ];

  private modalCtrl: ModalController = inject(ModalController);
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private userSub?: Subscription;
  private localization: LocalizationService = inject(LocalizationService);

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.updateAvatarSrc();
      this.setBasicInfo();
      if (this.user) {
        this.loadAvailableInterests();
        this.loadUserInterests(this.user.id);
      }
    });
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.authService.currentUser) return;
    this.user = await this.authService.fetchUserById(this.authService.currentUser.id);
    this.updateAvatarSrc();
    this.setBasicInfo();
    if (this.user) {
      await this.loadUserInterests(this.user.id);
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  selectTab(tab: 'overview' | 'posts' | 'listings'): void {
    this.selectedTab = tab;
  }

  getRoleBadgeColor(role: Role): string {
    switch (role) {
      case 'Admin':
        return 'danger';
      case 'Seller':
        return 'warning';
      case 'Basic':
      default:
        return 'primary';
    }
  }

  getRoleTranslationKey(role: Role): string {
    return `PROFILE.ROLE.${role.toUpperCase()}`;
  }

  getActivityIcon(type: 'post' | 'listing' | 'verification'): string {
    switch (type) {
      case 'post':
        return 'chatbox-ellipses';
      case 'listing':
        return 'home';
      case 'verification':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  }

  getActivityTime(daysAgo: number): string {
    if (daysAgo === 7) {
      return 'PROFILE.RECENT_ACTIVITY.WEEK_AGO';
    }
    return 'PROFILE.RECENT_ACTIVITY.DAYS_AGO';
  }

  getUserDisplayName(): string {
    if (this.user?.firstName && this.user?.lastName) {
      return `${this.user.firstName} ${this.user.lastName}`;
    }
    return this.user?.name || this.user?.username || 'User';
  }

  private updateAvatarSrc(): void {
    if (!this.user) {
      this.avatarSrc = DEFAULT_USER_URL;
      return;
    }
    const explicit = this.user.imgUrl || this.user.avatar_url;
    if (explicit) {
      this.avatarSrc = explicit;
      return;
    }
    const first = this.user.firstName?.trim() || '';
    const last = this.user.lastName?.trim() || '';
    const full = first || last ? encodeURIComponent(`${first} ${last}`.trim()) : encodeURIComponent(this.user.username);
    this.avatarSrc = `https://avatar.iran.liara.run/username?username=${full}`;
  }

  onAvatarError(): void {
    this.avatarSrc = DEFAULT_USER_URL;
  }

  private setBasicInfo(): void {
    if (!this.user) {
      return;
    }

    this.user.joinedDate = this.user.joinedDate || this.localization.formatDate(new Date());
    this.user.yearOfStudy = this.user.yearOfStudy || 1;
    this.user.isVerified = this.user.isVerified || false;
  }

  async logout(): Promise<void> {
    this.authService.logout();
    await this.router.navigate(['/login']);
  }

  private async loadAvailableInterests(): Promise<void> {
    try {
      this.loadingInterests = true;
      this.availableInterests = await this.authService.getAllInterests();
    } catch (_) {
      // mantener estado silencioso
    } finally {
      this.loadingInterests = false;
    }
  }

  private async loadUserInterests(userId: string): Promise<void> {
    try {
      this.userInterests = await this.authService.getUserInterests(userId);
    } catch (_) {
      this.userInterests = [];
    }
  }

  isUserHasInterest(interestId: string): boolean {
    return this.userInterests.some((i) => i.id === interestId);
  }

  async toggleInterest(interest: Interest): Promise<void> {
    if (!this.user) return;
    try {
      if (this.isUserHasInterest(interest.id)) {
        await this.authService.removeInterestFromUser(this.user.id, interest.id);
      } else {
        await this.authService.addInterestToUser(this.user.id, interest.id);
      }
      await this.loadUserInterests(this.user.id);
    } catch (_) {
    }
  }

  async openEditModal(): Promise<void> {
    if (!this.user) {
      return;
    }
    const modal: HTMLIonModalElement = await this.modalCtrl.create({
      component: ProfileEditModal,
      componentProps: { user: { ...this.user } },
      cssClass: 'profile-edit-modal'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && data.saved && data.user) {
      this.user = data.user as User;
      this.updateAvatarSrc();
      this.setBasicInfo();
      await this.loadUserInterests(this.user.id);
    }
  }
}
