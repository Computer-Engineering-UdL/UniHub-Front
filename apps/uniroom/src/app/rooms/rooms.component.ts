import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { ModalController, AlertController } from '@ionic/angular';
import { firstValueFrom, Subscription } from 'rxjs';
import { Offer, OfferListItem, OfferPhoto } from '../models/offer.types';
import { User } from '../models/auth.types';
import { CreateOfferModalComponent } from './create-offer-modal/create-offer-modal.component';
import { LocalizationService } from '../services/localization.service';
import NotificationService from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { resolveFileUrl } from '../utils/file-url.util';
import { LikesService } from '../services/likes.service';

interface Filters {
  search: string;
  minPrice: number;
  maxPrice: number;
  priceRange: { lower: number; upper: number };
  city: string;
  areaRange: { lower: number; upper: number };
  status: string;
  sortBy: string;
  showOnlyLiked: boolean;
}

interface ComparisonOffer {
  id: string;
  title: string;
  city: string;
  price: string;
  area: string;
  rooms: number | null;
  bathrooms: number | null;
  furnished: boolean | null;
  utilitiesIncluded: boolean | null;
  internetIncluded: boolean | null;
  deposit: string | null;
  availability: string | null;
  contractType: string | null;
  genderPreference: string | null;
  status: string;
  image: string | null;
}

type OfferDetailsResponse = Offer & {
  currency?: string | null;
  floor?: number | null;
  floor_number?: number | null;
  utilities_cost?: number | null;
  utilities_description?: string | null;
  contract_type?: string | null;
  distance_from_campus?: string | null;
};

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss'],
  standalone: false
})
export class RoomsComponent implements OnInit, OnDestroy {
  public offers: OfferListItem[] = [];
  public filteredOffers: OfferListItem[] = [];
  public user: User | null = null;
  public canCreateOffer: boolean = false;
  public availableCities: string[] = [];
  public showMobileFilters: boolean = false;
  public hasActiveFilters: boolean = false;
  public maxAvailablePrice: number = 2000;
  public maxAvailableArea: number = 200;
  public filters: Filters = {
    search: '',
    minPrice: 0,
    maxPrice: 2000,
    priceRange: { lower: 0, upper: 2000 },
    city: '',
    areaRange: { lower: 0, upper: 200 },
    status: '',
    sortBy: 'date_desc',
    showOnlyLiked: false
  };

  public decimalSeparator: string = '.';
  public thousandSeparator: string = ',';
  public showComparisonSection: boolean = false;
  public comparisonLoading: boolean = false;
  public compareSelection: { first: string | null; second: string | null } = { first: null, second: null };
  public comparisonOffers: { first: ComparisonOffer | null; second: ComparisonOffer | null } = {
    first: null,
    second: null
  };

  private readonly apiService: ApiService = inject(ApiService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly alertController: AlertController = inject(AlertController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly router: Router = inject(Router);
  private readonly likesService: LikesService = inject(LikesService);

  public likedIds: Set<string> = new Set<string>();
  private readonly likeLoadingMap: Map<string, boolean> = new Map();
  private likeChangeSubscription?: Subscription;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.canCreateOffer = user?.role === 'Seller' || user?.role === 'Admin';
    });

    const seps: { decimal: string; thousand: string } = this.localizationService.getNumberSeparators();
    this.decimalSeparator = seps.decimal;
    this.thousandSeparator = seps.thousand;

    this.likeChangeSubscription = this.likesService.likeChange$.subscribe((event) => {
      const offer: OfferListItem | undefined = this.offers.find((o: OfferListItem): boolean => o.id === event.targetId);
      if (offer) {
        offer.isLiked = event.liked;
        if (event.liked) {
          this.likedIds.add(event.targetId);
        } else {
          this.likedIds.delete(event.targetId);
        }
        this.applyFilters();
      }
    });

    void this.init();
  }

  ngOnDestroy(): void {
    this.likeChangeSubscription?.unsubscribe();
  }

  private async init(): Promise<void> {
    await this.loadOffers();
  }

  get availableComparisonOffers(): OfferListItem[] {
    return this.filteredOffers.filter((offer: OfferListItem): boolean => offer.status === 'active');
  }

  get hasComparisonSelection(): boolean {
    return !!(this.compareSelection.first || this.compareSelection.second);
  }

  private async loadOffers(): Promise<void> {
    try {
      this.offers = await firstValueFrom(this.apiService.get<OfferListItem[]>('offers/'));
      this.formatOffers();
      this.extractAvailableCities();
      this.calculateMaxPrice();
      this.calculateMaxArea();
      this.applyFilters();

      const liked: string[] = await firstValueFrom(this.likesService.getMyLikes());
      this.likedIds = new Set(liked || []);
      this.offers.forEach((offer: OfferListItem): void => {
        offer.isLiked = this.likedIds.has(offer.id);
      });
      this.applyFilters();
    } catch {
      this.notificationService.error('ROOM.COMPARISON.LOAD_ERROR');
    }
  }

  public isLikeLoading(offerId: string): boolean {
    return !!this.likeLoadingMap.get(offerId);
  }

  public async toggleLike(offer: OfferListItem): Promise<void> {
    if (!offer?.id) {
      return;
    }
    if (!this.authService.currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    const offerId: string = offer.id;
    if (this.isLikeLoading(offerId)) {
      return;
    }
    this.likeLoadingMap.set(offerId, true);

    try {
      if (this.likedIds.has(offerId) || offer.isLiked) {
        await firstValueFrom(this.likesService.unlike(offerId));
        this.likedIds.delete(offerId);
        offer.isLiked = false;
        this.notificationService.success('ROOM.UNLIKE_SUCCESS');
      } else {
        await firstValueFrom(this.likesService.like(offerId));
        this.likedIds.add(offerId);
        offer.isLiked = true;
        this.notificationService.success('ROOM.LIKE_SUCCESS');
      }
    } catch {
      this.notificationService.error('ROOM.LIKE_FAILED');
    } finally {
      this.likeLoadingMap.delete(offerId);
    }
  }

  private formatOffers(): void {
    this.offers.forEach((offer: OfferListItem): void => {
      const rawPrice: number = offer.price ?? 0;
      const currency: string = (offer.currency as string) ?? 'EUR';

      offer.priceFormatted = this.localizationService.formatPrice(rawPrice, currency);

      const rawArea: number = offer.area ?? 0;
      offer.areaFormatted = this.localizationService.formatNumber(rawArea, 2);
      offer.image = this.resolveOfferImage(offer);
    });

    this.fillMissingOfferImages();
  }

  private extractAvailableCities(): void {
    const citiesSet: Set<string> = new Set<string>();
    this.offers.forEach((offer: OfferListItem): void => {
      if (offer.city) {
        citiesSet.add(offer.city);
      }
    });
    this.availableCities = Array.from(citiesSet).sort();
  }

  private calculateMaxPrice(): void {
    if (this.offers.length > 0) {
      const maxPrice: number = Math.max(...this.offers.map((offer: OfferListItem): number => offer.price ?? 0));
      this.maxAvailablePrice = Math.ceil(maxPrice / 100) * 100;
      this.filters.priceRange.upper = this.maxAvailablePrice;
    }
  }

  private calculateMaxArea(): void {
    if (this.offers.length > 0) {
      const maxArea: number = Math.max(...this.offers.map((offer: OfferListItem): number => offer.area ?? 0));
      this.maxAvailableArea = Math.ceil(maxArea / 10) * 10;
      this.filters.areaRange.upper = this.maxAvailableArea;
    }
  }

  public applyFilters(): void {
    let filtered: OfferListItem[] = [...this.offers];

    if (this.filters.search) {
      const searchLower: string = this.filters.search.toLowerCase();
      filtered = filtered.filter(
        (offer: OfferListItem): boolean =>
          !!(
            offer.title?.toLowerCase().includes(searchLower) ||
            offer.city?.toLowerCase().includes(searchLower) ||
            offer.description?.toLowerCase().includes(searchLower)
          )
      );
    }

    if (this.filters.priceRange) {
      filtered = filtered.filter((offer: OfferListItem): boolean => {
        const price: number = offer.price ?? 0;
        return price >= this.filters.priceRange.lower && price <= this.filters.priceRange.upper;
      });
    }

    if (this.filters.city) {
      filtered = filtered.filter((offer: OfferListItem): boolean => offer.city === this.filters.city);
    }

    if (this.filters.areaRange) {
      filtered = filtered.filter((offer: OfferListItem): boolean => {
        const area: number = offer.area ?? 0;
        return area >= this.filters.areaRange.lower && area <= this.filters.areaRange.upper;
      });
    }

    if (this.filters.status) {
      filtered = filtered.filter((offer: OfferListItem): boolean => offer.status === this.filters.status);
    }

    if (this.filters.showOnlyLiked) {
      filtered = filtered.filter((offer: OfferListItem): boolean => this.likedIds.has(offer.id));
    }

    filtered = this.sortOffers(filtered);

    this.filteredOffers = filtered;
    this.updateHasActiveFilters();
  }

  public toggleComparisonSection(): void {
    this.showComparisonSection = !this.showComparisonSection;

    if (!this.showComparisonSection) {
      this.resetComparisonSelection();
    }
  }

  public async openComparisonSelector(offer: OfferListItem): Promise<void> {
    if (!this.showComparisonSection) {
      this.showComparisonSection = true;
    }

    if (this.compareSelection.first === offer.id || this.compareSelection.second === offer.id) {
      this.notificationService.info('ROOM.COMPARISON.ALREADY_SELECTED');
      return;
    }

    if (!this.compareSelection.first) {
      this.compareSelection.first = offer.id;
      await this.loadComparisonOffer('first', offer.id);
    } else if (!this.compareSelection.second) {
      this.compareSelection.second = offer.id;
      await this.loadComparisonOffer('second', offer.id);
    } else {
      this.compareSelection.first = offer.id;
      await this.loadComparisonOffer('first', offer.id);
    }
  }

  public resetComparisonSelection(): void {
    this.compareSelection = { first: null, second: null };
    this.comparisonOffers = { first: null, second: null };
    this.comparisonLoading = false;
  }

  public async onComparisonSelect(position: 'first' | 'second', offerId: string | null): Promise<void> {
    this.compareSelection[position] = offerId;
    this.comparisonOffers[position] = null;

    if (!offerId) {
      return;
    }

    await this.loadComparisonOffer(position, offerId);
  }

  private sortOffers(offers: OfferListItem[]): OfferListItem[] {
    const sorted: OfferListItem[] = [...offers];

    switch (this.filters.sortBy) {
      case 'date_desc':
        sorted.sort(
          (a: OfferListItem, b: OfferListItem): number =>
            new Date(b.posted_date || 0).getTime() - new Date(a.posted_date || 0).getTime()
        );
        break;
      case 'date_asc':
        sorted.sort(
          (a: OfferListItem, b: OfferListItem): number =>
            new Date(a.posted_date || 0).getTime() - new Date(b.posted_date || 0).getTime()
        );
        break;
      case 'price_asc':
        sorted.sort((a: OfferListItem, b: OfferListItem): number => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        sorted.sort((a: OfferListItem, b: OfferListItem): number => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'area_asc':
        sorted.sort((a: OfferListItem, b: OfferListItem): number => (a.area ?? 0) - (b.area ?? 0));
        break;
      case 'area_desc':
        sorted.sort((a: OfferListItem, b: OfferListItem): number => (b.area ?? 0) - (a.area ?? 0));
        break;
    }

    return sorted;
  }

  private async loadComparisonOffer(position: 'first' | 'second', offerId: string): Promise<void> {
    this.comparisonLoading = true;

    try {
      const offer: OfferDetailsResponse = await firstValueFrom(
        this.apiService.get<OfferDetailsResponse>(`offers/${offerId}`)
      );
      this.comparisonOffers[position] = this.mapComparisonOffer(offer);
    } catch (error) {
      console.error('Error loading comparison offer:', error);
      this.comparisonOffers[position] = null;
      this.notificationService.error('ROOM.COMPARISON.LOAD_ERROR');
    } finally {
      this.comparisonLoading = false;
    }
  }

  private mapComparisonOffer(offer: OfferDetailsResponse): ComparisonOffer {
    const currency: string = offer.currency ?? 'EUR';

    return {
      id: offer.id,
      title: offer.title,
      city: offer.city,
      price: this.localizationService.formatPrice(offer.price ?? 0, currency),
      area: this.localizationService.formatNumber(offer.area ?? 0, 0),
      rooms: offer.num_rooms ?? null,
      bathrooms: offer.num_bathrooms ?? null,
      furnished: offer.furnished ?? null,
      utilitiesIncluded: offer.utilities_included ?? null,
      internetIncluded: offer.internet_included ?? null,
      deposit: offer.deposit != null ? this.localizationService.formatPrice(offer.deposit, currency) : null,
      availability: offer.start_date ? this.localizationService.formatDate(offer.start_date) : null,
      contractType: this.formatContractType(offer.contract_type ?? null),
      genderPreference: this.formatGenderPreference(offer.gender_preference ?? null),
      status: offer.status,
      image: this.resolveOfferImageForComparison(offer)
    };
  }

  private resolveOfferImageForComparison(offer: OfferDetailsResponse): string | null {
    if (offer.base_image) {
      return resolveFileUrl(offer.base_image);
    }
    if (offer.photos && offer.photos.length > 0) {
      const sortedPhotos: OfferPhoto[] = offer.photos
        .slice()
        .sort((a: OfferPhoto, b: OfferPhoto) => (a.order ?? 0) - (b.order ?? 0));
      const primaryPhoto: OfferPhoto | undefined =
        sortedPhotos.find((photo: OfferPhoto) => photo.is_primary === true) ?? sortedPhotos[0];
      if (primaryPhoto) {
        return resolveFileUrl(primaryPhoto.url) ?? resolveFileUrl(primaryPhoto.file_metadata?.public_url) ?? null;
      }
    }
    return null;
  }

  private formatContractType(contractType: string | null): string | null {
    if (!contractType) {
      return null;
    }

    const contractTypeMap: Record<string, string> = {
      'long-term (min. 6 months)': 'ROOM.FORM.CONTRACT_TYPE_LONG',
      'short-term (1-6 months)': 'ROOM.FORM.CONTRACT_TYPE_SHORT',
      'academic stay': 'ROOM.FORM.CONTRACT_TYPE_ACADEMIC',
      other: 'ROOM.FORM.CONTRACT_TYPE_OTHER'
    };

    const normalized: string = contractType.trim().toLowerCase();
    const translationKey: string | undefined = contractTypeMap[normalized];

    if (translationKey) {
      const translated: string = this.translate.instant(translationKey);
      if (translated !== translationKey) {
        return translated;
      }
    }

    return contractType;
  }

  private formatGenderPreference(genderPreference: string | null): string | null {
    if (!genderPreference) {
      return null;
    }

    const translationKey: string = `ROOM.FORM.GENDER.${genderPreference.toUpperCase()}`;
    const translated: string = this.translate.instant(translationKey);
    return translated !== translationKey ? translated : genderPreference;
  }

  public formatComparisonBoolean(value: boolean | null): string {
    if (value === true) {
      return this.translate.instant('ROOM.COMPARISON.YES');
    }

    if (value === false) {
      return this.translate.instant('ROOM.COMPARISON.NO');
    }

    return this.translate.instant('ROOM.COMPARISON.NOT_PROVIDED');
  }

  public formatComparisonValue(value: string | number | null | undefined, suffix: string = ''): string {
    if (value === null || value === undefined || value === '') {
      return this.translate.instant('ROOM.COMPARISON.NOT_PROVIDED');
    }

    const formattedValue: string = String(value);
    return suffix ? `${formattedValue} ${suffix}` : formattedValue;
  }

  public compareNumericValue(
    position: 'first' | 'second',
    valueFirst: string | null,
    valueSecond: string | null,
    lowerIsBetter: boolean = false
  ): 'better' | 'worse' | 'equal' | 'none' {
    if (!valueFirst || !valueSecond) {
      return 'none';
    }

    const numFirst: number = this.extractNumericValue(valueFirst);
    const numSecond: number = this.extractNumericValue(valueSecond);

    if (isNaN(numFirst) || isNaN(numSecond)) {
      return 'none';
    }

    if (numFirst === numSecond) {
      return 'equal';
    }

    const firstIsBetter: boolean = lowerIsBetter ? numFirst < numSecond : numFirst > numSecond;

    if (position === 'first') {
      return firstIsBetter ? 'better' : 'worse';
    } else {
      return firstIsBetter ? 'worse' : 'better';
    }
  }

  private extractNumericValue(value: string): number {
    const cleaned: string = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    return parseFloat(cleaned);
  }

  public clearFilters(): void {
    this.filters = {
      search: '',
      minPrice: 0,
      maxPrice: this.maxAvailablePrice,
      priceRange: { lower: 0, upper: this.maxAvailablePrice },
      city: '',
      areaRange: { lower: 0, upper: this.maxAvailableArea },
      status: '',
      sortBy: 'date_desc',
      showOnlyLiked: false
    };
    this.applyFilters();
  }

  private updateHasActiveFilters(): void {
    this.hasActiveFilters = !!(
      this.filters.search ||
      this.filters.priceRange.lower !== 0 ||
      this.filters.priceRange.upper !== this.maxAvailablePrice ||
      this.filters.city ||
      this.filters.areaRange.lower !== 0 ||
      this.filters.areaRange.upper !== this.maxAvailableArea ||
      this.filters.status ||
      this.filters.sortBy !== 'date_desc' ||
      this.filters.showOnlyLiked
    );
  }

  public toggleMobileFilters(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  public formatAreaPin: (value: number) => string = (value: number): string => {
    return `${value} m²`;
  };

  public formatPricePin: (value: number) => string = (value: number): string => {
    return this.localizationService.formatPrice(value, 'EUR');
  };

  public onPriceRangeChange(): void {
    this.filters.minPrice = this.filters.priceRange.lower;
    this.filters.maxPrice = this.filters.priceRange.upper;
    this.applyFilters();
  }

  public onMinPriceChange(): void {
    const minValue: number = this.filters.minPrice;
    this.filters.priceRange = {
      lower: Math.max(0, Math.min(minValue, this.maxAvailablePrice)),
      upper: this.filters.priceRange.upper
    };
    this.applyFilters();
  }

  public onMaxPriceChange(): void {
    const maxValue: number = this.filters.maxPrice ?? this.maxAvailablePrice;
    this.filters.priceRange = {
      lower: this.filters.priceRange.lower,
      upper: Math.max(0, Math.min(maxValue, this.maxAvailablePrice))
    };
    this.applyFilters();
  }

  public async confirmDeleteOffer(offerId: string): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      cssClass: 'custom-delete-alert',
      header: this.translate.instant('ROOM.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('ROOM.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE') || 'Delete',
          cssClass: 'danger-btn',
          role: 'destructive',
          handler: async (): Promise<void> => {
            await this.deleteOffer(offerId);
          }
        }
      ]
    });

    await alert.present();
  }

  private async deleteOffer(offerId: string): Promise<void> {
    try {
      await firstValueFrom(this.apiService.delete(`offers/${offerId}`));
      this.notificationService.success('ROOM.DELETE_SUCCESS');
      await this.loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      this.notificationService.error('ROOM.DELETE_FAILED');
    }
  }

  private fillMissingOfferImages(): void {
    const placeholderImages: string[] = [
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ];

    this.offers.forEach((offer: OfferListItem & { image?: string | null }, index: number): void => {
      if (!offer.image) {
        offer.image = placeholderImages[index % placeholderImages.length];
      }
    });
  }

  private resolveOfferImage(offer: OfferListItem & { photos?: OfferPhoto[] | null }): string | null {
    if (offer.base_image) {
      const baseImageUrl: string | null = this.resolveBaseImageUrl(offer.base_image);
      if (baseImageUrl) {
        return baseImageUrl;
      }
    }

    const directImage: string | null = resolveFileUrl(offer.image) ?? null;
    if (directImage) {
      return directImage;
    }

    const photos: OfferPhoto[] = offer.photos ?? [];
    if (!photos.length) {
      return null;
    }

    const sortedPhotos: OfferPhoto[] = photos
      .slice()
      .sort((a: OfferPhoto, b: OfferPhoto) => (a.order ?? 0) - (b.order ?? 0));
    const primaryPhoto: OfferPhoto | undefined =
      sortedPhotos.find((photo: OfferPhoto) => photo.is_primary === true) ?? sortedPhotos[0];

    if (!primaryPhoto) {
      return null;
    }

    return resolveFileUrl(primaryPhoto.url) ?? resolveFileUrl(primaryPhoto.file_metadata?.public_url) ?? null;
  }

  private resolveBaseImageUrl(baseImage: string): string | null {
    if (!baseImage) {
      return null;
    }
    return resolveFileUrl(baseImage);
  }

  async openCreateOfferModal(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: CreateOfferModalComponent,
      cssClass: 'create-offer-modal',
      canDismiss: async (_data, role): Promise<boolean> => {
        if (role === 'created') {
          return true;
        }
        return await this.confirmDiscardOffer();
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'created' && data) {
      await this.loadOffers();
    }
  }

  private async confirmDiscardOffer(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.translate.instant('ROOM.FORM.DISCARD_TITLE'),
      message: this.translate.instant('ROOM.FORM.DISCARD_MESSAGE'),
      cssClass: 'custom-delete-alert',
      buttons: [
        {
          text: this.translate.instant('ROOM.FORM.CONTINUE_EDITING'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('ROOM.FORM.DISCARD_CONFIRM'),
          role: 'destructive',
          cssClass: 'danger-btn'
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  async viewOfferDetails(offerId: string): Promise<void> {
    this.showMobileFilters = false;
    await this.router.navigate(['/rooms', 'details', offerId]);
  }
}
