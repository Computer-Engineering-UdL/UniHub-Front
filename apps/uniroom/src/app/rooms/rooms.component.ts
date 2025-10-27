import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { ModalController, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { OfferListItem } from '../models/offer.types';
import { User } from '../models/auth.types';
import { CreateOfferModalComponent } from './create-offer-modal/create-offer-modal.component';
import { LocalizationService } from '../services/localization.service';
import NotificationService from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';

interface Filters {
  search: string;
  minPrice: number | null;
  maxPrice: number | null;
  priceRange: { lower: number; upper: number };
  city: string;
  areaRange: { lower: number; upper: number };
  status: string;
  sortBy: string;
}

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss'],
  standalone: false
})
export class RoomsComponent implements OnInit {
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
    minPrice: null,
    maxPrice: null,
    priceRange: { lower: 0, upper: 2000 },
    city: '',
    areaRange: { lower: 0, upper: 200 },
    status: '',
    sortBy: 'date_desc'
  };

  public decimalSeparator: string = '.';
  public thousandSeparator: string = ',';

  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);
  private modalController: ModalController = inject(ModalController);
  private localizationService: LocalizationService = inject(LocalizationService);
  private alertController: AlertController = inject(AlertController);
  private notificationService: NotificationService = inject(NotificationService);
  private translate: TranslateService = inject(TranslateService);

  async ngOnInit(): Promise<void> {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.canCreateOffer = user?.role === 'Seller' || user?.role === 'Admin';
    });

    const seps: { decimal: string; thousand: string } = this.localizationService.getNumberSeparators();
    this.decimalSeparator = seps.decimal;
    this.thousandSeparator = seps.thousand;

    await this.loadOffers();
  }

  private async loadOffers(): Promise<void> {
    try {
      this.offers = await firstValueFrom(this.apiService.get<OfferListItem[]>('offers/offers/'));
      this.formatOffers();
      this.extractAvailableCities();
      this.calculateMaxPrice();
      this.calculateMaxArea();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  }

  private formatOffers(): void {
    this.offers.forEach((offer: OfferListItem): void => {
      const rawPrice: number = offer.price ?? 0;
      const currency: string = (offer.currency as string) ?? 'EUR';

      offer.priceFormatted = this.localizationService.formatPrice(rawPrice, currency);

      const rawArea: number = offer.area ?? 0;
      offer.areaFormatted = this.localizationService.formatNumber(rawArea, 2);
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

    if (this.filters.minPrice !== null && this.filters.minPrice > 0) {
      filtered = filtered.filter((offer: OfferListItem): boolean => (offer.price ?? 0) >= (this.filters.minPrice ?? 0));
    }

    if (this.filters.maxPrice !== null && this.filters.maxPrice > 0) {
      filtered = filtered.filter((offer: OfferListItem): boolean => (offer.price ?? 0) <= (this.filters.maxPrice ?? 0));
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

    filtered = this.sortOffers(filtered);

    this.filteredOffers = filtered;
    this.updateHasActiveFilters();
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

  public clearFilters(): void {
    this.filters = {
      search: '',
      minPrice: null,
      maxPrice: null,
      priceRange: { lower: 0, upper: this.maxAvailablePrice },
      city: '',
      areaRange: { lower: 0, upper: this.maxAvailableArea },
      status: '',
      sortBy: 'date_desc'
    };
    this.applyFilters();
  }

  private updateHasActiveFilters(): void {
    this.hasActiveFilters = !!(
      this.filters.search ||
      (this.filters.minPrice !== null && this.filters.minPrice > 0) ||
      (this.filters.maxPrice !== null && this.filters.maxPrice > 0) ||
      this.filters.city ||
      this.filters.areaRange.lower !== 0 ||
      this.filters.areaRange.upper !== this.maxAvailableArea ||
      this.filters.status ||
      this.filters.sortBy !== 'date_desc'
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
    const minValue: number = this.filters.minPrice ?? 0;
    this.filters.priceRange.lower = Math.max(0, Math.min(minValue, this.maxAvailablePrice));
    this.applyFilters();
  }

  public onMaxPriceChange(): void {
    const maxValue: number = this.filters.maxPrice ?? this.maxAvailablePrice;
    this.filters.priceRange.upper = Math.max(0, Math.min(maxValue, this.maxAvailablePrice));
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
      await firstValueFrom(this.apiService.delete(`offers/offers/${offerId}`));
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

    this.offers.forEach((offer: any, index: number): void => {
      if (!offer.image) {
        offer.image = placeholderImages[index % placeholderImages.length];
      }
    });
  }

  async openCreateOfferModal(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: CreateOfferModalComponent,
      cssClass: 'create-offer-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'created' && data) {
      await this.loadOffers();
    }
  }

  async viewOfferDetails(offerId: string): Promise<void> {
    // TODO: Implement view offer details
    console.log('View offer details:', offerId);
  }
}
