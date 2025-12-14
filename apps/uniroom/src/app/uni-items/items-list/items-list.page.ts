import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { ItemCategory, ItemCondition, ItemRead, ItemsListParams, ItemsListResponse } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';

interface UniItemViewModel {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  condition: ItemCondition;
  priceFormatted: string;
  primaryImage: string | null;
  location: string;
  postedDate: string;
}

@Component({
  selector: 'app-items-list',
  templateUrl: './items-list.page.html',
  styleUrls: ['./items-list.page.scss'],
  standalone: false
})
export class ItemsListPage implements OnInit, OnDestroy {
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);

  private itemsChangedSubscription?: Subscription;

  items: UniItemViewModel[] = [];
  loading: boolean = false;
  total: number = 0;
  hasMore: boolean = false;
  currentPage: number = 1;
  readonly pageSize: number = 10;
  showMobileFilters: boolean = false;

  filters: ItemsListParams = {
    search: '',
    category_ids: [],
    min_price: undefined,
    max_price: undefined,
    conditions: [],
    location: '',
    sort: 'newest'
  };

  categories: ItemCategory[] = [];
  readonly conditionOptions: ReadonlyArray<{ value: ItemCondition; labelKey: string }> = [
    { value: 'New', labelKey: 'UNI_ITEMS.CONDITION_LABELS.NEW' },
    { value: 'Like New', labelKey: 'UNI_ITEMS.CONDITION_LABELS.LIKE_NEW' },
    { value: 'Good', labelKey: 'UNI_ITEMS.CONDITION_LABELS.GOOD' },
    { value: 'Fair', labelKey: 'UNI_ITEMS.CONDITION_LABELS.FAIR' },
    { value: 'Poor', labelKey: 'UNI_ITEMS.CONDITION_LABELS.POOR' }
  ];
  readonly conditionLabelMap: Record<ItemCondition, string> = this.conditionOptions.reduce(
    (acc: Record<ItemCondition, string>, option) => ({ ...acc, [option.value]: option.labelKey }),
    {} as Record<ItemCondition, string>
  );

  get canCreate(): boolean {
    return !!this.authService.currentUser;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.category_ids?.length ||
      this.filters.conditions?.length ||
      this.filters.min_price ||
      this.filters.max_price ||
      this.filters.location ||
      this.filters.sort !== 'newest'
    );
  }

  ngOnInit(): void {
    void this.loadCategories();
    void this.loadItems(true);

    this.itemsChangedSubscription = this.uniItemsService.itemsChanged$.subscribe(() => {
      void this.loadItems(true);
    });
  }

  ngOnDestroy(): void {
    this.itemsChangedSubscription?.unsubscribe();
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await firstValueFrom(this.uniItemsService.getCategories());
    } catch {
      this.notificationService.error('UNI_ITEMS.FILTERS.ERROR_CATEGORIES');
    }
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
    const query: ItemsListParams = {
      ...this.filters,
      category_ids: this.filters.category_ids?.length ? this.filters.category_ids : undefined,
      conditions: this.filters.conditions?.length ? this.filters.conditions : undefined,
      page: this.currentPage,
      page_size: this.pageSize
    };

    try {
      const response: ItemsListResponse = await firstValueFrom(this.uniItemsService.listItems(query));
      const mapped: UniItemViewModel[] = response.items.map(
        (item: ItemRead): UniItemViewModel => ({
          id: item.id,
          title: item.title,
          description: item.description,
          categoryName: this.getCategoryTranslationKey(item.category?.name ?? ''),
          condition: item.condition,
          priceFormatted: this.localization.formatPrice(item.price, item.currency),
          primaryImage: item.image_urls?.[0] ?? item.owner_details?.avatar_url ?? null,
          location: item.location,
          postedDate: this.localization.formatDate(item.posted_date)
        })
      );

      this.items = reset ? mapped : [...this.items, ...mapped];
      this.total = response.total;
      this.hasMore = this.items.length < this.total;
      this.currentPage += 1;
    } catch {
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
      category_ids: [],
      min_price: undefined,
      max_price: undefined,
      conditions: [],
      location: '',
      sort: 'newest'
    };
    void this.loadItems(true);
  }

  toggleCategory(categoryId: string): void {
    const categoryIds: string[] = this.filters.category_ids || [];
    if (categoryIds.includes(categoryId)) {
      this.filters.category_ids = categoryIds.filter((c: string): boolean => c !== categoryId);
    } else {
      this.filters.category_ids = [...categoryIds, categoryId];
    }
    this.applyFilters();
  }

  toggleCondition(condition: ItemCondition): void {
    const selected: ItemCondition[] = this.filters.conditions || [];
    if (selected.includes(condition)) {
      this.filters.conditions = selected.filter((value: ItemCondition) => value !== condition);
    } else {
      this.filters.conditions = [...selected, condition];
    }
    this.applyFilters();
  }

  clearConditions(): void {
    this.filters.conditions = [];
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

  openItem(item: UniItemViewModel): void {
    void this.router.navigate(['/items', item.id]);
  }

  getCategoryTranslationKey(categoryName: string): string {
    if (!categoryName) {
      return '';
    }
    const normalized: string = categoryName.toUpperCase().replace(/\s+/g, '_');
    return `UNI_ITEMS.CATEGORY.${normalized}`;
  }
}
