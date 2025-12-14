import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { LocalizationService } from '../../services/localization.service';
import { Offer, OfferAmenity, OfferHouseRules, OfferPhoto } from '../../models/offer.types';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { DEFAULT_USER_URL, User } from '../../models/auth.types';
import {
  AMENITY_DEFINITIONS,
  AMENITY_DEFINITIONS_BY_CODE,
  AMENITY_DEFINITIONS_BY_KEY
} from '../../models/amenities.constants';
import { resolveFileUrl } from '../../utils/file-url.util';
import { MessageService } from '../../services/message.service';
import NotificationService from '../../services/notification.service';
import { Conversation } from '../../models/message.types';
import { LikesService } from '../../services/likes.service';
import { ModalController } from '@ionic/angular';
import { ReportCategory, ReportReason } from '../../models/report.types';
import { ReportModalComponent } from '../../shared/reports/report-modal.component';
import { ReportService } from '../../services/report.service';
import { AlertController } from '@ionic/angular';

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
  userId?: string;
  username?: string;
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
  private readonly messageService: MessageService = inject(MessageService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly likesService: LikesService = inject(LikesService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly alertController: AlertController = inject(AlertController);

  loading: boolean = false;
  error: boolean = false;
  offer: RoomDetailsViewModel | null = null;
  selectedImageIndex: number = 0;
  isViewerOpen: boolean = false;

  public isLiked: boolean = false;
  public likeLoading: boolean = false;

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
      const landlordUser: User | null = this.getCachedLandlordUser(response.user_id);
      this.offer = this.mapToViewModel(response, landlordUser);
      if (!this.offer?.landlord?.avatar) {
        this.offer.landlord.avatar = await this.getUserAvatar(this.offer.landlord.userId as string);
      }

      // load like status for this offer
      try {
        const status = await firstValueFrom(this.likesService.getLikeStatus(offerId));
        this.isLiked = status.liked;
      } catch {
        this.isLiked = false;
      }
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  private async getUserAvatar(userId: string): Promise<string> {
    const user: User = this.authService.mapUserFromApi(
      await firstValueFrom(this.apiService.get<User>(`user/public/${userId}`))
    );
    return user.avatar_url || user.imgUrl || '';
  }

  public async toggleLike(): Promise<void> {
    if (!this.offer) {
      return;
    }

    if (!this.authService.currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    if (this.likeLoading) {
      return;
    }
    this.likeLoading = true;
    try {
      if (this.isLiked) {
        await firstValueFrom(this.likesService.unlike(this.offer.id));
        this.isLiked = false;
        this.notificationService.success('ROOM.UNLIKE_SUCCESS');
      } else {
        await firstValueFrom(this.likesService.like(this.offer.id));
        this.isLiked = true;
        this.notificationService.success('ROOM.LIKE_SUCCESS');
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      this.notificationService.error('ROOM.LIKE_FAILED');
    } finally {
      this.likeLoading = false;
    }
  }

  selectImage(index: number): void {
    if (!this.offer) {
      return;
    }
    this.selectedImageIndex = index;
  }

  openImageViewer(index: number): void {
    if (!this.offer) {
      return;
    }
    this.selectedImageIndex = index;
    this.isViewerOpen = true;
  }

  closeImageViewer(): void {
    this.isViewerOpen = false;
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
  private mapToViewModel(offer: OfferDetailsResponse, landlordUser?: User | null): RoomDetailsViewModel {
    const currency: string = offer.currency ?? 'EUR';
    const priceFormatted: string = this.localization.formatPrice(offer.price ?? 0, currency);
    const areaFormatted: string = this.localization.formatNumber(offer.area ?? 0, 0);
    const depositFormatted: string | undefined =
      offer.deposit != null ? this.localization.formatPrice(offer.deposit, currency) : undefined;

    const photos: GalleryImage[] = this.buildGallery(offer.photos);
    const amenities: AmenityItem[] = this.buildAmenities(offer);
    const rules: HouseRuleItem[] = this.buildHouseRules(offer);
    const financialDetails: FinancialDetailItem[] = this.buildFinancialDetails(offer, currency, depositFormatted);
    const landlord: LandlordInfo = this.buildLandlordInfo(offer, landlordUser);
    const mapUrl: SafeResourceUrl | undefined = this.buildMapUrl(offer);
    const distanceFromCampus: string | undefined = offer.distance_from_campus ?? offer.distanceFromCampus ?? undefined;

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
      distanceFromCampus,
      availableFrom,
      postedDate,
      description: offer.description,
      areaFormatted,
      numRooms: offer.num_rooms ?? null,
      numBathrooms: offer.num_bathrooms ?? null,
      floor: this.toNullableNumber(offer.floor ?? offer.floor_number),
      depositFormatted,
      utilitiesIncluded: offer.utilities_included ?? null,
      photos,
      amenities,
      houseRules: rules,
      financialDetails,
      landlord,
      mapUrl,
      utilitiesCost:
        offer.utilities_cost == null ? undefined : this.localization.formatPrice(offer.utilities_cost, currency),
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

    const normalizedPhotos: GalleryImage[] = (photos ?? [])
      .slice()
      .sort((a: OfferPhoto, b: OfferPhoto) => (a.order ?? 0) - (b.order ?? 0))
      .map((photo: OfferPhoto, index: number) => {
        const resolvedUrl: string | null =
          resolveFileUrl(photo.url) ?? resolveFileUrl(photo.file_metadata?.public_url) ?? null;
        if (!resolvedUrl) {
          return null;
        }
        return {
          url: resolvedUrl,
          isPrimary: photo.is_primary === true || index === 0
        };
      })
      .filter((photo): photo is GalleryImage => !!photo);

    if (normalizedPhotos.length > 0) {
      return normalizedPhotos;
    }

    return placeholders.map((url: string, index: number) => ({
      url,
      isPrimary: index === 0
    }));
  }

  private buildAmenities(offer: OfferDetailsResponse): AmenityItem[] {
    const amenityMap: Map<string, AmenityItem> = new Map();
    const extraAmenityKeys: Set<string> = new Set();

    AMENITY_DEFINITIONS.forEach((definition) => {
      const relatedField = definition.relatedOfferField;
      let baseAvailability: boolean | null | undefined;

      if (relatedField && relatedField in offer) {
        baseAvailability = offer[relatedField as keyof OfferDetailsResponse] as boolean | null | undefined;
      }

      const initialAvailability: boolean | null =
        baseAvailability ?? (definition.defaultAvailable === undefined ? null : definition.defaultAvailable);

      amenityMap.set(definition.key, {
        icon: definition.icon,
        labelKey: definition.labelKey,
        available: initialAvailability
      });
    });

    const resolveAmenityKey = (identifier: unknown): string | null => {
      if (identifier === null || identifier === undefined) {
        return null;
      }

      if (typeof identifier === 'number') {
        const definition = AMENITY_DEFINITIONS_BY_CODE[String(identifier)];
        return definition ? definition.key : String(identifier);
      }

      if (typeof identifier === 'string') {
        const trimmed: string = identifier.trim();
        if (!trimmed) {
          return null;
        }

        const definitionByCode = AMENITY_DEFINITIONS_BY_CODE[trimmed];
        if (definitionByCode) {
          return definitionByCode.key;
        }

        const lower = trimmed.toLowerCase();
        if (AMENITY_DEFINITIONS_BY_KEY[lower]) {
          return lower;
        }

        return lower;
      }

      return null;
    };

    const applyAvailability = (identifier: unknown, available?: boolean | null): void => {
      const key = resolveAmenityKey(identifier);
      if (!key) {
        return;
      }

      const resolvedAvailability: boolean | null = available ?? amenityMap.get(key)?.available ?? true;

      const amenity = amenityMap.get(key);
      if (amenity) {
        amenity.available = resolvedAvailability;
        return;
      }

      amenityMap.set(key, {
        icon: 'ellipse-outline',
        labelKey: this.getAmenityLabel(key),
        available: resolvedAvailability
      });
      extraAmenityKeys.add(key);
    };

    const amenitiesFromResponse: OfferAmenity[] = Array.isArray(offer.amenities)
      ? (offer.amenities as OfferAmenity[])
      : [];

    if (amenitiesFromResponse.length > 0) {
      amenitiesFromResponse.forEach((item: OfferAmenity) => {
        if (item === null || item === undefined) {
          return;
        }

        if (typeof item === 'string' || typeof item === 'number') {
          applyAvailability(item, true);
          return;
        }

        const identifier = item.code ?? item.key;
        applyAvailability(identifier, item.available);
      });
    }

    const orderedAmenities: AmenityItem[] = AMENITY_DEFINITIONS.map((definition) => {
      const amenity = amenityMap.get(definition.key);
      if (amenity) {
        return amenity;
      }
      return {
        icon: definition.icon,
        labelKey: definition.labelKey,
        available: definition.defaultAvailable ?? null
      };
    }).filter((amenity): amenity is AmenityItem => !!amenity);

    extraAmenityKeys.forEach((key) => {
      const amenity = amenityMap.get(key);
      if (amenity) {
        orderedAmenities.push(amenity);
      }
    });

    return orderedAmenities;
  }

  private buildHouseRules(offer: OfferDetailsResponse): HouseRuleItem[] {
    const defaultRules: HouseRuleItem[] = [
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.SMOKING', allowed: false },
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.PETS', allowed: false },
      { labelKey: 'ROOM.DETAILS.HOUSE_RULES.COUPLES', allowed: false }
    ];

    const normalizedRules: OfferHouseRules | null | undefined = offer.rules ?? offer.house_rules;

    if (!normalizedRules) {
      return defaultRules;
    }

    return defaultRules.map((rule: HouseRuleItem) => {
      const key: string = rule.labelKey.split('.').pop()?.toLowerCase() ?? '';
      const rawValue: unknown = normalizedRules?.[key];
      const allowed: boolean = rawValue === undefined ? rule.allowed : this.toBoolean(rawValue);
      return {
        ...rule,
        allowed
      };
    });
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed: number = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'string') {
      const normalized: string = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return value === true;
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
        value: depositFormatted ?? this.translate.instant('ROOM.DETAILS.FINANCIAL.NOT_SPECIFIED')
      },
      {
        labelKey: 'ROOM.DETAILS.FINANCIAL.UTILITIES',
        value: offer.utilities_included
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

  private getCachedLandlordUser(userId?: string): User | null {
    if (!userId) {
      return null;
    }

    const currentUser: User | null = this.authService.currentUser;
    if (currentUser?.id === userId) {
      return currentUser;
    }

    return null;
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
      userId: offer.user_id,
      username: landlordUser?.username,
      name,
      initials,
      avatar: landlordUser?.avatar_url || landlordUser?.imgUrl || landlordData.avatar || undefined,
      memberSince,
      responseTime:
        landlordData.response_time || this.translate.instant('ROOM.DETAILS.LANDLORD.RESPONSE_TIME_PLACEHOLDER'),
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

    const parts: string[] = [user.firstName, user.lastName].filter(
      (part): part is string => !!part && part.trim().length > 0
    );
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

  async startPrivateConversation(): Promise<void> {
    if (!this.offer?.landlord.userId) {
      this.notificationService.error('ROOM.DETAILS.LANDLORD.ERROR.NO_USER_ID');
      return;
    }

    const currentUser: User | null = this.authService.currentUser;
    if (!currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    if (this.offer.landlord.userId === currentUser.id) {
      this.notificationService.error('ROOM.DETAILS.LANDLORD.ERROR.CANNOT_MESSAGE_YOURSELF');
      return;
    }

    try {
      const conversation: Conversation = await firstValueFrom(
        this.messageService.getOrCreateConversation(this.offer.landlord.userId, this.offer.id)
      );
      await this.router.navigate(['/messages'], { queryParams: { id: conversation.id } });
    } catch {
      this.notificationService.error('MESSAGES.CREATE_ERROR');
    }
  }

  async viewLandlordProfile(): Promise<void> {
    if (this.offer?.landlord.userId) {
      await this.router.navigate(['/profile', this.offer.landlord.userId]);
    }
  }

  async reportListing(): Promise<void> {
    if (!this.offer) {
      return;
    }

    if (!this.authService.currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    const modal = await this.modalController.create({
      component: ReportModalComponent,
      cssClass: 'report-modal',
      componentProps: {
        context: {
          contentType: ReportCategory.HOUSING,
          contentId: this.offer.id,
          contentTitle: this.offer.title,
          reportedUserId: this.offer.landlord.userId,
          allowedReasons: [
            ReportReason.SCAM_FRAUD,
            ReportReason.FAKE_LISTING,
            ReportReason.INAPPROPRIATE_CONTENT,
            ReportReason.OTHER
          ]
        }
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'submit' && data) {
      try {
        await firstValueFrom(
          this.reportService.createReport({
            contentType: ReportCategory.HOUSING,
            contentId: this.offer.id,
            reportedUserId: this.offer.landlord.userId,
            reason: data.reason,
            description: data.description,
            contentTitle: this.offer.title
          })
        );
        this.notificationService.success(this.translate.instant('REPORT.SUCCESS'));
      } catch {
        this.notificationService.error(this.translate.instant('REPORT.ERROR'));
      }
    }
  }

  private buildMapUrl(offer: OfferDetailsResponse): SafeResourceUrl | undefined {
    if (offer.latitude != null && offer.longitude != null) {
      const coords: string = `${offer.latitude},${offer.longitude}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${coords}&z=15&output=embed`);
    }

    if (offer.address || offer.city) {
      const query: string = encodeURIComponent(`${offer.address || ''} ${offer.city || ''}`.trim());
      if (query.length === 0) {
        return undefined;
      }
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${query}&z=15&output=embed`);
    }

    return undefined;
  }

  canDeleteOffer(): boolean {
    const currentUser: User | null = this.authService.currentUser;
    if (!this.offer || !currentUser) {
      return false;
    }
    return currentUser.role === 'Admin' || this.offer.landlord.userId === currentUser.id;
  }

  async deleteOffer(): Promise<void> {
    if (!this.offer) {
      return;
    }
    const alert = await this.alertController.create({
      cssClass: 'custom-delete-alert',
      header: this.translate.instant('ROOM.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('ROOM.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          cssClass: 'danger-btn',
          role: 'destructive',
          handler: async (): Promise<void> => {
            try {
              await firstValueFrom(this.apiService.delete(`offers/${this.offer!.id}`));
              this.notificationService.success('ROOM.DELETE_SUCCESS');
              await this.router.navigate(['/rooms']);
            } catch {
              this.notificationService.error('ROOM.DELETE_FAILED');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getAmenityLabel(amenityId: string): string {
    const amenityKey: string = `ROOM.DETAILS.AMENITIES.${amenityId.toUpperCase()}`;
    const translation: string = this.translate.instant(amenityKey);
    if (translation === amenityKey) {
      return this.translate.instant('ROOM.DETAILS.AMENITIES.OTHER');
    }
    return translation;
  }

  protected readonly avatarSrc = DEFAULT_USER_URL;
}
