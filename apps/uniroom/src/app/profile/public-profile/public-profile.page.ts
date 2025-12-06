import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { DEFAULT_USER_URL, Interest } from '../../models/auth.types';
import { LocalizationService } from '../../services/localization.service';
import { OfferListItem } from '../../models/offer.types';
import { environment } from '../../../environments/environment';
import { API_VERSION_PATH } from '../../../environments/environment.model';
import { firstValueFrom, Subscription } from 'rxjs';

interface PublicUserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  faculty: {
    id: string;
    name: string;
    address: string;
    university: {
      id: string;
      name: string;
    };
  } | null;
  is_verified: boolean;
}

interface ProfileStats {
  listings: number;
  channels: number;
}

@Component({
  selector: 'app-public-profile',
  templateUrl: './public-profile.page.html',
  styleUrls: ['./public-profile.page.scss'],
  standalone: false
})
export class PublicProfilePage implements OnInit, OnDestroy {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly localization: LocalizationService = inject(LocalizationService);

  user: PublicUserProfile | null = null;
  selectedTab: 'overview' | 'listings' = 'overview';
  avatarSrc: string = DEFAULT_USER_URL;

  stats: ProfileStats = {
    listings: 0,
    channels: 0
  };

  userInterests: Interest[] = [];
  userOffers: OfferListItem[] = [];

  loadingProfile: boolean = false;
  loadingInterests: boolean = false;
  loadingOffers: boolean = false;

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params): void => {
      const username: string | null = params['username'];
      if (username) {
        void this.loadUserProfile(username);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  async loadUserProfile(username: string): Promise<void> {
    this.loadingProfile = true;
    try {
      const users: PublicUserProfile[] = await firstValueFrom(
        this.apiService.get<PublicUserProfile[]>('user/', { username })
      );

      if (users && users.length > 0) {
        this.user = users[0];
        this.updateAvatarSrc();
        await this.loadUserInterests(this.user.id);
        await this.loadUserOffers(this.user.id);
        this.calculateStats();
      } else {
        this.notificationService.error('PROFILE.ERROR.USER_NOT_FOUND');
        await this.router.navigate(['/home']);
      }
    } catch {
      this.notificationService.error('PROFILE.ERROR.LOAD_PROFILE');
      await this.router.navigate(['/home']);
    } finally {
      this.loadingProfile = false;
    }
  }

  selectTab(tab: 'overview' | 'listings'): void {
    this.selectedTab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private calculateStats(): void {
    this.stats = {
      listings: this.userOffers.length,
      channels: 0
    };
  }

  getUserDisplayName(): string {
    if (this.user?.first_name && this.user?.last_name) {
      return `${this.user.first_name} ${this.user.last_name}`;
    }
    return this.user?.username || 'User';
  }

  private updateAvatarSrc(): void {
    if (!this.user) {
      this.avatarSrc = DEFAULT_USER_URL;
      return;
    }
    const explicit: string = this.user.avatar_url;
    if (explicit) {
      this.avatarSrc = explicit;
      return;
    }
    const first: string = this.user.first_name?.trim() || '';
    const last: string = this.user.last_name?.trim() || '';
    const full: string =
      first || last ? encodeURIComponent(`${first} ${last}`.trim()) : encodeURIComponent(this.user.username);
    this.avatarSrc = `https://avatar.iran.liara.run/username?username=${full}`;
  }

  onAvatarError(): void {
    this.avatarSrc = DEFAULT_USER_URL;
  }

  private async loadUserInterests(userId: string): Promise<void> {
    try {
      this.loadingInterests = true;
      const response: Interest[] = await firstValueFrom(this.apiService.get<Interest[]>(`user/interests/${userId}`));
      this.userInterests = response || [];
    } catch {
      this.userInterests = [];
    } finally {
      this.loadingInterests = false;
    }
  }

  private async loadUserOffers(userId: string): Promise<void> {
    try {
      this.loadingOffers = true;
      this.userOffers = await firstValueFrom(this.apiService.get<OfferListItem[]>(`offers/user/${userId}`));
      this.formatUserOffers();
    } catch {
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

      const resolvedImage: string | null = this.resolveOfferImage(offer);
      if (resolvedImage) {
        offer.image = resolvedImage;
      } else {
        offer.image = 'https://via.placeholder.com/400x300/e0e0e0/666666?text=No+Image';
      }
    });
  }

  private resolveOfferImage(offer: OfferListItem): string | null {
    if (offer.base_image) {
      const baseImageUrl: string | null = this.resolveBaseImageUrl(offer.base_image);
      if (baseImageUrl) {
        return baseImageUrl;
      }
    }

    if (offer.image) {
      const trimmed: string = offer.image.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
    }

    return null;
  }

  private resolveBaseImageUrl(baseImage: string): string | null {
    if (!baseImage) {
      return null;
    }
    const apiBaseUrl: string = environment.apiUrl.replace(API_VERSION_PATH, '');
    return `${apiBaseUrl}${baseImage}`;
  }

  async navigateToOffer(offer: OfferListItem): Promise<void> {
    await this.router.navigate(['/rooms', 'details', offer.id]);
  }
}

