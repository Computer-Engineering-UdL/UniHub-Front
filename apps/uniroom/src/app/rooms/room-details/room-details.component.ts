import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { LocalizationService } from '../../services/localization.service';
import { Offer, OfferPhoto } from '../../models/offer.types';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';

interface AmenityItem {
  icon: string;
  labelKey: string;
  available: boolean | null;
}

interface HouseRuleItem {
  labelKey: string;
  allowed: boolean;
}

interface FinancialDetailItem {
  labelKey: string;
  value: string;
  description?: string;
}

interface LandlordInfo {
  name: string;
  initials: string;
  avatar?: string;
  memberSince?: string;
  responseTime?: string;
  lastSeen?: string;
  phone?: string;
  email?: string;
}

interface GalleryImage {
  url: string;
  isPrimary: boolean;
}

interface RoomDetailsViewModel {
  id: string;
  title: string;
  status: string;
  isAvailable: boolean;
  priceFormatted: string;
  currency: string;
  address: string;
  city: string;
  distanceFromCampus?: string;
  availableFrom?: string;
  postedDate?: string;
  description?: string;
  areaFormatted: string;
  numRooms: number | null;
  numBathrooms: number | null;
  floor?: number | null;
  depositFormatted?: string;
  utilitiesIncluded: boolean | null;
  photos: GalleryImage[];
  amenities: AmenityItem[];
  houseRules: HouseRuleItem[];
  financialDetails: FinancialDetailItem[];
  landlord: LandlordInfo;
  mapUrl?: SafeResourceUrl;
  utilitiesCost?: string;
  contractType?: string;
  leaseEnd?: string;
  offerValidUntil?: string;
}

type OfferDetailsResponse = Offer & {
  currency?: string;
  distance_from_campus?: string;
  distanceFromCampus?: string;
  floor?: number;
  landlord?: {
    name?: string;
    avatar?: string;
    member_since?: string;
    response_time?: string;
    last_seen?: string;
    phone?: string;
    email?: string;
  } | null;
  amenities?: Array<{
    key: string;
    available?: boolean;
  }>;
  rules?: Record<string, boolean>;
  utilities_cost?: number;
  utilities_description?: string;
  contract_type?: string;
  latitude?: number;
  longitude?: number;
};

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.component.html',
  styleUrls: ['./room-details.component.scss'],
  standalone: false
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly authService: AuthService = inject(AuthService);

  loading: boolean = false;
  error: boolean = false;
  offer: RoomDetailsViewModel | null = null;
  selectedImageIndex: number = 0;

  private paramSub?: Subscription;

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params: ParamMap): void => {
      const offerId: string | null = params.get('id');
      if (!offerId) {
        this.error = true;
        return;
      }
      void this.loadOfferDetails(offerId);
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  async loadOfferDetails(offerId: string): Promise<void> {
    this.loading = true;
    this.error = false;
    this.offer = null;
    this.selectedImageIndex = 0;

    try {
      const response: OfferDetailsResponse = await firstValueFrom(
        this.apiService.get<OfferDetailsResponse>(`offers/${offerId}`)
      );
      const landlordUser: User | null = await this.resolveLandlordUser(response.user_id);
      this.offer = this.mapToViewModel(response, landlordUser);
    } catch (err: any) {
      console.error('Error loading offer details', err);
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  selectImage(index: number): void {
    if (!this.offer) {
      return;
    }
    this.selectedImageIndex = index;
  }

  showPreviousImage(): void {
    if (!this.offer) {
      return;
    }
    const total: number = this.offer.photos.length;
    this.selectedImageIndex = (this.selectedImageIndex - 1 + total) % total;
  }

  showNextImage(): void {
    if (!this.offer) {
      return;
    }
    const total: number = this.offer.photos.length;
    this.selectedImageIndex = (this.selectedImageIndex + 1) % total;
  }

  goBackToList(): void {
    void this.router.navigate(['/rooms']);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private mapToViewModel(offer: OfferDetailsResponse, landlordUser?: User | null): RoomDetailsViewModel {
    const currency: string = offer.currency ?? 'EUR';
    const priceFormatted: string = this.localization.formatPrice(offer.price ?? 0, currency);
    const areaFormatted: string = this.localization.formatNumber(offer.area ?? 0, 0);
    const depositFormatted: string | undefined =
      offer.deposit != null ? this.localization.formatPrice(offer.deposit, currency) : undefined;

    const photos: GalleryImage[] = this.buildGallery(offer.photos);
    const amenities: AmenityItem[] = this.buildAmenities(offer);
    const rules: HouseRuleItem[] = this.buildHouseRules(offer);
    const financialDetails: FinancialDetailItem[] = this.buildFinancialDetails(
      offer,
      currency,
      depositFormatted
    );
    const landlord: LandlordInfo = this.buildLandlordInfo(offer, landlordUser);
    const mapUrl: SafeResourceUrl | undefined = this.buildMapUrl(offer);

    const availableFrom: string | undefined = offer.start_date
      ? this.localization.formatDate(offer.start_date, {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      })
      : undefined;

    const postedDate: string | undefined = offer.posted_date
      ? this.localization.formatDate(offer.posted_date)
      : undefined;
    const leaseEnd: string | undefined = offer.end_date
      ? this.localization.formatDate(offer.end_date, {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      })
      : undefined;

    const offerValidUntil: string | undefined = offer.offer_valid_until
      ? this.localization.formatDate(offer.offer_valid_until)
      : undefined;

    return {
      id: offer.id,
      title: offer.title,
      status: offer.status,
      isAvailable: offer.status === 'active',
      priceFormatted,
      currency,
      address: offer.address,
      city: offer.city,
      availableFrom,
      postedDate,
      description: offer.description,
      areaFormatted,
      numRooms: offer.num_rooms ?? null,
      numBathrooms: offer.num_bathrooms ?? null,
      floor: offer.floor ?? null,
      depositFormatted,
      utilitiesIncluded: offer.utilities_included ?? null,
      photos,
      amenities,
      houseRules: rules,
      financialDetails,
      landlord,
      mapUrl,
      utilitiesCost:
        offer.utilities_cost != null
          ? this.localization.formatPrice(offer.utilities_cost, currency)
          : undefined,
      contractType: offer.contract_type ?? undefined,
      leaseEnd,
      offerValidUntil
    };
  }

  private buildGallery(photos?: OfferPhoto[] | null): GalleryImage[] {
    const placeholders: string[] = [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=1200&h=800&fit=crop'
    ];

    if (!photos || photos.length === 0) {
      return placeholders.map((url: string, index: number) => ({
        url,
        isPrimary: index === 0
      }));
    }

    return photos.map((photo: OfferPhoto, index: number) => ({
      url: photo.url,
      isPrimary: photo.is_primary === true || index === 0
    }));
  }

  private buildAmenities(offer: OfferDetailsResponse): AmenityItem[] {
    const amenityLookup: Record<string, AmenityItem> = {
      wifi: {
        icon: 'wifi-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.WIFI',
        available: offer.internet_included ?? null
      },
      utilities: {
        icon: 'flash-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.UTILITIES',
        available: offer.utilities_included ?? null
      },
      furnished: {
        icon: 'bed-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.FURNISHED',
        available: offer.furnished ?? null
      },
      heating: {
        icon: 'flame-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.HEATING',
        available: null
      },
      parking: {
        icon: 'car-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.PARKING',
        available: null
      },
      kitchen: {
        icon: 'restaurant-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.KITCHEN',
        available: true
      },
      tv: {
        icon: 'tv-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.TV',
        available: null
      },
      security: {
        icon: 'shield-checkmark-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.SECURITY',
        available: null
      },
      balcony: {
        icon: 'home-outline',
        labelKey: 'ROOM.DETAILS.AMENITIES.BALCONY',
        available: null
      }
    };

    if (offer.amenities && offer.amenities.length > 0) {
      offer.amenities.forEach((item) => {
        const key: string = item.key.toLowerCase();
        if (amenityLookup[key]) {
          amenityLookup[key].available = item.available ?? amenityLookup[key].available;
        }
      });
    }

    return Object.values(amenityLookup);
  }

  private buildHouseRules(offer: OfferDetailsResponse): HouseRuleItem[] {
    const defaultRules: HouseRuleItem[] = [
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.SMOKING', allowed: false },
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.PETS', allowed: false },
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.COUPLES', allowed: false }
    ];

    if (!offer.rules) {
      return defaultRules;
    }

    return defaultRules.map((rule: HouseRuleItem) => {
      const key: string = rule.labelKey.split('.').pop()?.toLowerCase() ?? '';
      const allowed: boolean = offer.rules?.[key] ?? rule.allowed;
      return {
        ...rule,
        allowed
      };
    });
  }

  private buildFinancialDetails(
    offer: OfferDetailsResponse,
    currency: string,
    depositFormatted?: string
  ): FinancialDetailItem[] {
    const items: FinancialDetailItem[] = [
      {
        labelKey: 'ROOM.DETAILS.FINANCIAL.MONTHLY_RENT',
        value: this.localization.formatPrice(offer.price ?? 0, currency)
      },
      {
        labelKey: 'ROOM.DETAILS.FINANCIAL.DEPOSIT',
        value:
          depositFormatted ?? this.translate.instant('ROOM.DETAILS.FINANCIAL.NOT_SPECIFIED')
      },
      {
        labelKey: 'ROOM.DETAILS.FINANCIAL.UTILITIES',
        value:
          offer.utilities_included
            ? this.translate.instant('ROOM.DETAILS.FINANCIAL.INCLUDED')
            : offer.utilities_cost != null
              ? `${this.localization.formatPrice(offer.utilities_cost, currency)} / ${this.translate.instant(
                'ROOM.DETAILS.FINANCIAL.MONTH'
              )}`
              : this.translate.instant('ROOM.DETAILS.FINANCIAL.NOT_INCLUDED'),
        description: offer.utilities_description ?? undefined
      }
    ];

    items.push({
      labelKey: 'ROOM.DETAILS.FINANCIAL.CONTRACT_TYPE',
      value: offer.contract_type ?? this.translate.instant('ROOM.DETAILS.FINANCIAL.LONG_TERM')
    });

    return items;
  }

  private async resolveLandlordUser(userId?: string): Promise<User | null> {
    if (!userId) {
      return null;
    }

    try {
      return await this.authService.fetchUserById(userId);
    } catch (error) {
      console.warn('Failed to load landlord user', error);
      return null;
    }
  }

  private buildLandlordInfo(offer: OfferDetailsResponse, landlordUser?: User | null): LandlordInfo {
    const fallbackName: string = this.translate.instant('ROOM.DETAILS.LANDLORD.DEFAULT_NAME');
    const landlordData = offer.landlord ?? {};

    const userDisplayName: string | undefined = this.getUserDisplayName(landlordUser);
    const name: string = userDisplayName || landlordData.name || fallbackName;
    const initials: string = this.computeInitials(name);

    const memberSince: string | undefined = landlordUser?.joinedDate
      ? this.localization.formatDate(landlordUser.joinedDate, {
        year: 'numeric',
        month: 'long'
      })
      : landlordData.member_since
        ? this.localization.formatDate(landlordData.member_since, {
          year: 'numeric',
          month: 'long'
        })
        : offer.posted_date
          ? this.localization.formatDate(offer.posted_date, {
            year: 'numeric',
            month: 'long'
          })
          : undefined;

    const lastSeen: string | undefined = landlordData.last_seen
      ? this.localization.formatRelativeTime(landlordData.last_seen)
      : landlordUser?.joinedDate
        ? this.localization.formatRelativeTime(landlordUser.joinedDate)
        : offer.posted_date
          ? this.localization.formatRelativeTime(offer.posted_date)
          : undefined;

    return {
      name,
      initials,
      avatar: landlordUser?.avatar_url || landlordUser?.imgUrl || landlordData.avatar || undefined,
      memberSince,
      responseTime:
        landlordData.response_time ||
        this.translate.instant('ROOM.DETAILS.LANDLORD.RESPONSE_TIME_PLACEHOLDER'),
      lastSeen,
      phone: landlordUser?.phone || landlordData.phone || undefined,
      email: landlordUser?.email || landlordData.email || undefined
    };
  }

  private getUserDisplayName(user?: User | null): string | undefined {
    if (!user) {
      return undefined;
    }

    if (user.fullName && user.fullName.trim().length > 0) {
      return user.fullName;
    }

    const parts: string[] = [user.firstName, user.lastName].filter((part): part is string => !!part && part.trim().length > 0);
    if (parts.length) {
      return parts.join(' ');
    }

    if (user.name && user.name.trim().length > 0) {
      return user.name;
    }

    return user.username;
  }

  private computeInitials(name: string): string {
    const parts: string[] = name
      .split(' ')
      .filter((p) => p.trim().length > 0)
      .slice(0, 2);
    if (parts.length === 0) {
      return '?';
    }
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  private buildMapUrl(offer: OfferDetailsResponse): SafeResourceUrl | undefined {
    if (offer.latitude != null && offer.longitude != null) {
      const coords: string = `${offer.latitude},${offer.longitude}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps?q=${coords}&z=15&output=embed`
      );
    }

    if (offer.address || offer.city) {
      const query: string = encodeURIComponent(`${offer.address || ''} ${offer.city || ''}`.trim());
      if (query.length === 0) {
        return undefined;
      }
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps?q=${query}&z=15&output=embed`
      );
    }

    return undefined;
  }
}
