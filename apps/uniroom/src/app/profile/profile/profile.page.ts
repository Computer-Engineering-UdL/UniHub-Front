import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChannelService } from '../../services/channel.service';
import { ApiService } from '../../services/api.service';
import { DEFAULT_USER_URL, Interest, InterestCategory, Role, User } from '../../models/auth.types';
import { ModalController } from '@ionic/angular';
import { ProfileEditModal } from '../profile-edit.modal';
import { AddInterestModalComponent } from '../add-interest-modal/add-interest-modal.component';
import { firstValueFrom, Subscription } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import { Channel, ChannelMember } from '../../models/channel.types';
import { OfferListItem } from '../../models/offer.types';

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
    posts: 0,
    listings: 0,
    helpful: 0,
    channels: 0
  };

  availableCategories: InterestCategory[] = [];
  userInterests: Interest[] = [];
  userOffers: OfferListItem[] = [];

  loadingInterests: boolean = false;
  loadingOffers: boolean = false;

  recentActivity: RecentActivity[] = [
    { type: 'post', translationKey: 'PROFILE.RECENT_ACTIVITY.POSTED_IN', daysAgo: 2 },
    { type: 'listing', translationKey: 'PROFILE.RECENT_ACTIVITY.UPDATED_LISTING', daysAgo: 5 },
    { type: 'verification', translationKey: 'PROFILE.RECENT_ACTIVITY.EMAIL_VERIFIED', daysAgo: 7 }
  ];

  private modalCtrl: ModalController = inject(ModalController);
  private authService: AuthService = inject(AuthService);
  private channelService: ChannelService = inject(ChannelService);
  private apiService: ApiService = inject(ApiService);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private userSub?: Subscription;
  private localization: LocalizationService = inject(LocalizationService);

  ngOnInit(): void {
    const tab: string | null = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'overview' || tab === 'posts' || tab === 'listings') {
      this.selectedTab = tab;
    }

    this.userSub = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.updateAvatarSrc();
      this.setBasicInfo();
      if (this.user) {
        void this.loadAvailableInterests();
        void this.loadUserInterests(this.user.id);
        void this.loadUserOffers(this.user.id);
        void this.parseStats();
      }
    });
  }

  async ionViewWillEnter(): Promise<void> {
    // IMPORTANT: This method is called every time the view is about to enter even IDE shows it is not used
    if (!this.authService.currentUser) {
      return;
    }
    this.user = await this.authService.fetchUserById(this.authService.currentUser.id);
    this.updateAvatarSrc();
    this.setBasicInfo();
    if (this.user) {
      await this.loadUserInterests(this.user.id);
      await this.loadUserOffers(this.user.id);
      await this.parseStats();
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  selectTab(tab: 'overview' | 'posts' | 'listings'): void {
    this.selectedTab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private async parseStats(): Promise<void> {
    if (!this.user) {
      return;
    }

    this.stats = {
      posts: 0,
      listings: this.userOffers.length,
      helpful: 0,
      channels: await this.getUserChannels()
    };
  }

  private async getUserChannels(): Promise<number> {
    try {
      const allChannels: Channel[] = await this.channelService.fetchChannels();
      const membershipChecks: Awaited<boolean>[] = await Promise.all(
        allChannels.map(async (channel: Channel): Promise<boolean> => {
          try {
            const members: ChannelMember[] = await this.channelService.getChannelMembers(channel.id);
            return members.some((member: ChannelMember): boolean => member.user_id === this.user!.id);
          } catch {
            return false;
          }
        })
      );

      return membershipChecks.filter((isMember: boolean): boolean => isMember).length;
    } catch (_) {
      return 0;
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
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  private async loadAvailableInterests(): Promise<void> {
    try {
      this.loadingInterests = true;
      this.availableCategories = await this.authService.getAllInterestCategories();
    } catch (_) {
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

  private async loadUserOffers(userId: string): Promise<void> {
    try {
      this.loadingOffers = true;
      this.userOffers = await firstValueFrom(this.apiService.get<OfferListItem[]>(`offers/user/${userId}`));
      this.formatUserOffers();
    } catch (_) {
      this.userOffers = [];
    } finally {
      this.loadingOffers = false;
    }
  }

  private formatUserOffers(): void {
    this.userOffers.forEach((offer: OfferListItem): void => {
      const rawPrice: number = offer.price ?? 0;
      const currency: string = (offer.currency as string) ?? 'EUR';

      offer.priceFormatted = this.localization.formatPrice(rawPrice, currency);

      const rawArea: number = offer.area ?? 0;
      offer.areaFormatted = this.localization.formatNumber(rawArea, 2);

      if (!offer.image) {
        offer.image = 'https://via.placeholder.com/400x300/e0e0e0/666666?text=No+Image';
      }
    });
  }

  async removeInterest(interest: Interest): Promise<void> {
    if (!this.user || this.loadingInterests) {
      return;
    }

    try {
      this.loadingInterests = true;
      await this.authService.removeInterestFromUser(this.user.id, interest.id);
      await this.loadUserInterests(this.user.id);
    } catch (_) {
    } finally {
      this.loadingInterests = false;
    }
  }

  async addInterest(interest: Interest): Promise<void> {
    if (!this.user || this.loadingInterests) {
      return;
    }

    try {
      this.loadingInterests = true;
      await this.authService.addInterestToUser(this.user.id, interest.id);
      await this.loadUserInterests(this.user.id);
    } catch (_) {
    } finally {
      this.loadingInterests = false;
    }
  }

  async openAddInterestModal(): Promise<void> {
    if (!this.user) {
      return;
    }

    const userInterestIds: string[] = this.userInterests.map((i: Interest) => i.id);

    const modal: HTMLIonModalElement = await this.modalCtrl.create({
      component: AddInterestModalComponent,
      componentProps: {
        availableCategories: this.availableCategories,
        userInterestIds: userInterestIds,
        onToggle: async (interest: Interest, isSelected: boolean): Promise<void> => {
          if (isSelected) {
            // Remove interest
            await this.removeInterest(interest);
          } else {
            // Add interest
            await this.addInterest(interest);
          }
        }
      },
      cssClass: 'add-interest-modal'
    });

    await modal.present();
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
