import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.types';
import { firstValueFrom, Subscription } from 'rxjs';
import { ChannelService } from '../services/channel.service';
import { Channel } from '../models/channel.types';
import { OfferListItem } from '../models/offer.types';
import { ApiService } from '../services/api.service';
import { ItemCondition, ItemRead, ItemsListParams } from '../models/uni-item.types';
import { UniItemsService } from '../services/uni-items.service';
import { LocalizationService } from '../services/localization.service';
import NotificationService from '../services/notification.service';
import { resolveFileUrl } from '../utils/file-url.util';

interface HomeSection {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
  badge?: number;
}

interface HomeItemCard {
  id: string;
  title: string;
  categoryName: string;
  condition: ItemCondition;
  priceFormatted: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  public user: User | null = null;
  public loading: boolean = true;
  public channels: Channel[] = [];
  public offers: OfferListItem[] = [];
  public uniItems: HomeItemCard[] = [];
  public sections: HomeSection[] = [];
  public recommendedOffers: OfferListItem[] = [];
  public popularChannels: Channel[] = [];

  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly channelService: ChannelService = inject(ChannelService);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private userSub?: Subscription;
  readonly conditionLabelMap: Record<ItemCondition, string> = {
    New: 'UNI_ITEMS.CONDITION_LABELS.NEW',
    'Like New': 'UNI_ITEMS.CONDITION_LABELS.LIKE_NEW',
    Good: 'UNI_ITEMS.CONDITION_LABELS.GOOD',
    Fair: 'UNI_ITEMS.CONDITION_LABELS.FAIR',
    Poor: 'UNI_ITEMS.CONDITION_LABELS.POOR'
  };

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
    });

    this.initializeSections();
    void this.loadHomeData();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  private initializeSections(): void {
    this.sections = [
      {
        title: 'HOME.SECTIONS.CHANNELS.TITLE',
        subtitle: 'HOME.SECTIONS.CHANNELS.SUBTITLE',
        icon: 'chatbubbles-outline',
        route: '/channels',
        color: 'primary'
      },
      {
        title: 'HOME.SECTIONS.UNIROOM.TITLE',
        subtitle: 'HOME.SECTIONS.UNIROOM.SUBTITLE',
        icon: 'business',
        route: '/rooms',
        color: 'success'
      },
      {
        title: 'HOME.SECTIONS.UNIITEMS.TITLE',
        subtitle: 'HOME.SECTIONS.UNIITEMS.SUBTITLE',
        icon: 'cube-outline',
        route: '/items',
        color: 'secondary'
      },
      {
        title: 'HOME.SECTIONS.UNIBORSA.TITLE',
        subtitle: 'HOME.SECTIONS.UNIBORSA.SUBTITLE',
        icon: 'briefcase',
        route: '/jobs',
        color: 'tertiary'
      }
    ];
  }

  private async loadHomeData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadChannels(),
        this.loadOffers(),
        this.loadUniItems(),
        this.loadRecommendedOffers(),
        this.loadPopularChannels()
      ]);
    } catch {
      this.notificationService.error('HOME.ERROR.LOAD_FAILED');
    } finally {
      this.loading = false;
    }
  }

  private async loadChannels(): Promise<void> {
    try {
      const allChannels: Channel[] = await this.channelService.fetchChannels();
      this.channels = allChannels.slice(0, 4);
    } catch {
      this.channels = [];
    }
  }

  private async loadOffers(): Promise<void> {
    try {
      const allOffers: OfferListItem[] = await firstValueFrom(this.apiService.get<OfferListItem[]>('offers/'));
      this.offers = allOffers
        .filter((offer: OfferListItem): boolean => offer.status === 'active')
        .slice(0, 4)
        .map((offer: OfferListItem): OfferListItem => {
          const rawPrice: number = offer.price ?? 0;
          const currency: string = (offer.currency as string) ?? 'EUR';
          offer.priceFormatted = this.localizationService.formatPrice(rawPrice, currency);
          offer.image = this.resolveOfferImage(offer);
          return offer;
        });
    } catch {
      this.offers = [];
    }
  }

  private async loadUniItems(): Promise<void> {
    try {
      const query: ItemsListParams = {
        page: 1,
        page_size: 4,
        sort: 'newest'
      };
      const result = await firstValueFrom(this.uniItemsService.listItems(query));
      this.uniItems = result.items.slice(0, 4).map(
        (item: ItemRead): HomeItemCard => ({
          id: item.id,
          title: item.title,
          categoryName: item.category?.name ?? '',
          condition: item.condition,
          priceFormatted: this.localizationService.formatPrice(item.price, item.currency),
          imageUrl: item.image_urls?.[0] ?? item.owner_details?.avatar_url ?? null
        })
      );
    } catch {
      this.uniItems = [];
    }
  }

  private async loadRecommendedOffers(): Promise<void> {
    try {
      const allOffers: OfferListItem[] = await firstValueFrom(this.apiService.get<OfferListItem[]>('offers/'));
      const activeOffers: OfferListItem[] = allOffers.filter(
        (offer: OfferListItem): boolean => offer.status === 'active'
      );
      const sortedOffers: OfferListItem[] = [...activeOffers].sort(
        (a: OfferListItem, b: OfferListItem): number => (b.price ?? 0) - (a.price ?? 0)
      );
      this.recommendedOffers = sortedOffers.slice(0, 8).map((offer: OfferListItem): OfferListItem => {
        const rawPrice: number = offer.price ?? 0;
        const currency: string = (offer.currency as string) ?? 'EUR';
        offer.priceFormatted = this.localizationService.formatPrice(rawPrice, currency);
        offer.image = this.resolveOfferImage(offer);
        return offer;
      });
    } catch {
      this.recommendedOffers = [];
    }
  }

  private async loadPopularChannels(): Promise<void> {
    try {
      const allChannels: Channel[] = await this.channelService.fetchChannels();
      const sortedChannels: Channel[] = [...allChannels].sort(
        (a: Channel, b: Channel): number => this.getChannelMemberCount(b) - this.getChannelMemberCount(a)
      );
      this.popularChannels = sortedChannels.slice(0, 6);
    } catch {
      this.popularChannels = [];
    }
  }

  private resolveOfferImage(offer: OfferListItem): string {
    if (offer.base_image) {
      const resolvedUrl: string | null = resolveFileUrl(offer.base_image);
      if (resolvedUrl) {
        return resolvedUrl;
      }
    }

    if (offer.image) {
      const trimmed: string = offer.image.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      const resolvedUrl: string | null = resolveFileUrl(trimmed);
      if (resolvedUrl) {
        return resolvedUrl;
      }
    }

    return 'https://via.placeholder.com/400x300/e0e0e0/666666?text=No+Image';
  }

  public navigateTo(route: string): void {
    void this.router.navigate([route]);
  }

  public navigateToChannel(channelId: string): void {
    void this.router.navigate(['/channels', channelId]);
  }

  public navigateToOffer(offerId: string): void {
    void this.router.navigate(['/rooms/details/', offerId]);
  }

  public navigateToItem(itemId: string): void {
    void this.router.navigate(['/items', itemId]);
  }

  public getChannelMemberCount(channel: Channel): number {
    return channel.member_count ?? channel.members_count ?? 0;
  }
}
