import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Theme, ThemeService } from '../../services/theme.service';
import { LangCode, LocalizationService } from '../../services/localization.service';
import { Role, User } from '../../models/auth.types';
import { Subscription } from 'rxjs';

interface ProfileStats {
  posts: number;
  listings: number;
  helpful: number;
  channels: number;
}

interface Interest {
  name: string;
  translationKey: string;
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
  currentTheme: Theme = 'system';
  currentLanguage: LangCode = 'en';
  selectedTab: 'overview' | 'posts' | 'listings' = 'overview';

  stats: ProfileStats = {
    posts: 12,
    listings: 3,
    helpful: 45,
    channels: 8
  };

  interests: Interest[] = [
    { name: 'Programming', translationKey: 'Programming' },
    { name: 'Web Development', translationKey: 'Web Development' },
    { name: 'Data Science', translationKey: 'Data Science' },
    { name: 'Gaming', translationKey: 'Gaming' },
    { name: 'Photography', translationKey: 'Photography' },
    { name: 'Hiking', translationKey: 'Hiking' },
    { name: 'Music Production', translationKey: 'Music Production' }
  ];

  recentActivity: RecentActivity[] = [
    { type: 'post', translationKey: 'PROFILE.RECENT_ACTIVITY.POSTED_IN', daysAgo: 2 },
    { type: 'listing', translationKey: 'PROFILE.RECENT_ACTIVITY.UPDATED_LISTING', daysAgo: 5 },
    { type: 'verification', translationKey: 'PROFILE.RECENT_ACTIVITY.EMAIL_VERIFIED', daysAgo: 7 }
  ];

  private authService: AuthService = inject(AuthService);
  private themeService: ThemeService = inject(ThemeService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private router: Router = inject(Router);
  private userSub?: Subscription;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.setUserImgUrl();
      this.setBasicInfo();
    });
    this.currentTheme = this.themeService.getTheme();
    this.currentLanguage = this.localizationService.getCurrentLanguage();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  selectTab(tab: 'overview' | 'posts' | 'listings'): void {
    this.selectedTab = tab;
  }

  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }

  changeLanguage(lang: LangCode): void {
    this.localizationService.changeLanguage(lang);
    this.currentLanguage = lang;
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      case 'system':
        return 'contrast';
      default:
        return 'contrast';
    }
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

  private setUserImgUrl(): void {
    if (!this.user) {
      return;
    }

    this.user.imgUrl = this.user?.imgUrl || 'assets/img/default-profile.png';
  }

  private setBasicInfo(): void {
    if (!this.user) {
      return;
    }

    this.user.joinedDate = this.user.joinedDate || new Date().toLocaleDateString();
    this.user.yearOfStudy = this.user.yearOfStudy || 1;
    this.user.isVerified = this.user.isVerified || false;
  }

  async logout(): Promise<void> {
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
