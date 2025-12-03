import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniItem, UniItemsQuery } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';

interface UniItemViewModel extends UniItem {
  priceFormatted: string;
  primaryImage: string | null;
}

@Component({
  selector: 'app-items-list',
  templateUrl: './items-list.page.html',
  styleUrls: ['./items-list.page.scss'],
  standalone: false
})
export class ItemsListPage implements OnInit {
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);

  items: UniItemViewModel[] = [];
  loading: boolean = false;
  total: number = 0;
  hasMore: boolean = false;
  currentPage: number = 1;
  readonly pageSize: number = 10;
  showMobileFilters: boolean = false;

  filters: UniItemsQuery = {
    search: '',
    categories: [],
    minPrice: undefined,
    maxPrice: undefined,
    condition: '',
    location: '',
    sort: 'newest'
  };

  readonly categories: string[] = ['Furniture', 'Books', 'Electronics', 'Clothing', 'Other'];
  readonly conditions: { value: UniItem['condition']; labelKey: string }[] = [
    { value: 'new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.new' },
    { value: 'like_new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.like_new' },
    { value: 'good', labelKey: 'UNI_ITEMS.CONDITION_LABELS.good' },
    { value: 'used', labelKey: 'UNI_ITEMS.CONDITION_LABELS.used' },
    { value: 'for_parts', labelKey: 'UNI_ITEMS.CONDITION_LABELS.for_parts' }
  ];

  get canCreate(): boolean {
    return !!this.authService.currentUser;
  }

  ngOnInit(): void {
    void this.loadItems(true);
  }

  async loadItems(reset: boolean = false, event?: InfiniteScrollCustomEvent): Promise<void> {
    if (this.loading) {
      event?.target.complete();
      return;
    }

    if (reset) {
      this.currentPage = 1;
      this.items = [];
    }

    this.loading = reset;
    const query: UniItemsQuery = {
      ...this.filters,
      categories: this.filters.categories?.length ? this.filters.categories : undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    try {
      const response = await firstValueFrom(this.uniItemsService.getItems(query));
      const mapped: UniItemViewModel[] = response.items.map((item: UniItem): UniItemViewModel => ({
        ...item,
        priceFormatted: this.localization.formatPrice(item.price, item.currency),
        primaryImage: item.images?.[0] ?? null
      }));

      this.items = reset ? mapped : [...this.items, ...mapped];
      this.total = response.total;
      this.hasMore = this.items.length < this.total;
      this.currentPage += 1;
    } catch (error) {
      console.error('Error loading items', error);
      this.notificationService.error('UNI_ITEMS.LIST.ERROR');
    } finally {
      this.loading = false;
      event?.target.complete();
    }
  }

  applyFilters(): void {
    void this.loadItems(true);
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      categories: [],
      minPrice: undefined,
      maxPrice: undefined,
      condition: '',
      location: '',
      sort: 'newest'
    };
    void this.loadItems(true);
  }

  toggleCategory(category: string): void {
    const categories: string[] = this.filters.categories || [];
    if (categories.includes(category)) {
      this.filters.categories = categories.filter((c: string): boolean => c !== category);
    } else {
      this.filters.categories = [...categories, category];
    }
    this.applyFilters();
  }

  selectCondition(condition: UniItem['condition'] | ''): void {
    this.filters.condition = condition;
    this.applyFilters();
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    if (this.hasMore) {
      void this.loadItems(false, event);
    } else {
      event.target.complete();
    }
  }

  onRefresh(event: CustomEvent): void {
    void this.loadItems(true).then(() => event.detail?.complete?.());
  }

  openFilters(): void {
    this.showMobileFilters = true;
  }

  closeFilters(): void {
    this.showMobileFilters = false;
  }

  goToCreate(): void {
    void this.router.navigate(['/items/new']);
  }

  openItem(item: UniItem): void {
    void this.router.navigate(['/items', item.id]);
  }
}
