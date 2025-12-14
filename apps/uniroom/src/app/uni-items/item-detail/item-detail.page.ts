import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { ItemCondition, ItemRead } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';
import { LocalizationService } from '../../services/localization.service';
import { MessageService } from '../../services/message.service';
import { TranslateService } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';

// Register Swiper web components
register();

interface UniItemDetailViewModel {
  id: string;
  title: string;
  description: string;
  priceFormatted: string;
  categoryName: string;
  condition: ItemCondition;
  location: string;
  imageUrls: string[];
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  postedDateLabel: string;
  updatedLabel?: string;
  mapUrl?: SafeResourceUrl;
}

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.page.html',
  styleUrls: ['./item-detail.page.scss'],
  standalone: false
})
export class ItemDetailPage implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly alertController: AlertController = inject(AlertController);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);

  item: UniItemDetailViewModel | null = null;
  loading: boolean = true;
  contacting: boolean = false;
  readonly conditionLabelMap: Record<ItemCondition, string> = {
    New: 'UNI_ITEMS.CONDITION_LABELS.NEW',
    'Like New': 'UNI_ITEMS.CONDITION_LABELS.LIKE_NEW',
    Good: 'UNI_ITEMS.CONDITION_LABELS.GOOD',
    Fair: 'UNI_ITEMS.CONDITION_LABELS.FAIR',
    Poor: 'UNI_ITEMS.CONDITION_LABELS.POOR'
  };

  get isOwner(): boolean {
    return !!this.item && this.authService.currentUser?.id === this.item.ownerId;
  }

  ngOnInit(): void {
    const id: string | null = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.loadItem(id);
    }
  }

  async loadItem(id: string): Promise<void> {
    this.loading = true;
    try {
      const response: ItemRead = await firstValueFrom(this.uniItemsService.getItemDetail(id));
      this.item = {
        id: response.id,
        title: response.title,
        description: response.description,
        priceFormatted: this.localization.formatPrice(response.price, response.currency),
        categoryName: this.getCategoryTranslationKey(response.category?.name ?? ''),
        condition: response.condition,
        location: response.location,
        imageUrls: response.image_urls ?? [],
        ownerId: response.owner_details?.id ?? '',
        ownerName: response.owner_details?.full_name || response.owner_details?.username || '',
        ownerAvatar: response.owner_details?.avatar_url ?? null,
        postedDateLabel: this.localization.formatDate(response.posted_date),
        updatedLabel: response.updated_at ? this.localization.formatRelativeTime(response.updated_at) : undefined,
        mapUrl: this.buildMapUrl(response)
      };
    } catch {
      this.notificationService.error('UNI_ITEMS.DETAIL.ERROR');
    } finally {
      this.loading = false;
    }
  }

  private buildMapUrl(item: ItemRead): SafeResourceUrl | undefined {
    if (item.latitude != null && item.longitude != null) {
      const coords: string = `${item.latitude},${item.longitude}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${coords}&z=15&output=embed`);
    }

    if (item.location) {
      const query: string = encodeURIComponent(item.location.trim());
      if (query.length === 0) {
        return undefined;
      }
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${query}&z=15&output=embed`);
    }

    return undefined;
  }

  async contactSeller(): Promise<void> {
    if (!this.item) {
      return;
    }

    if (!this.authService.currentUser) {
      this.notificationService.error('UNI_ITEMS.AUTH.REQUIRED');
      await this.router.navigate(['/login']);
      return;
    }

    this.contacting = true;
    try {
      await firstValueFrom(this.messageService.createConversation(this.item.ownerId, undefined, this.item.id));
      this.notificationService.success('UNI_ITEMS.DETAIL.CONTACT_SUCCESS');
      await this.router.navigate(['/messages']);
    } catch {
      this.notificationService.error('UNI_ITEMS.DETAIL.CONTACT_ERROR');
    } finally {
      this.contacting = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!this.item) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.translate.instant('UNI_ITEMS.DETAIL.DELETE_TITLE'),
      message: this.translate.instant('UNI_ITEMS.DETAIL.DELETE_MESSAGE'),
      buttons: [
        { text: this.translate.instant('UNI_ITEMS.DETAIL.DELETE_CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('UNI_ITEMS.DETAIL.DELETE_CONFIRM'),
          role: 'destructive',
          handler: () => {
            void this.confirmDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDelete(): Promise<void> {
    if (!this.item) {
      return;
    }

    try {
      await firstValueFrom(this.uniItemsService.deleteItem(this.item.id));
      this.notificationService.success('UNI_ITEMS.DETAIL.DELETE_SUCCESS');
      await this.router.navigate(['/items']);
    } catch {
      this.notificationService.error('UNI_ITEMS.DETAIL.DELETE_ERROR');
    }
  }

  editItem(): void {
    if (!this.item) {
      return;
    }
    void this.router.navigate(['/items', this.item.id, 'edit']);
  }

  goBackToList(): void {
    void this.router.navigate(['/items']);
  }

  async viewSellerProfile(): Promise<void> {
    if (this.item?.ownerId) {
      await this.router.navigate(['/profile', this.item.ownerId]);
    }
  }

  private getCategoryTranslationKey(categoryName: string): string {
    if (!categoryName) {
      return '';
    }
    const normalized: string = categoryName.toUpperCase().replace(/\s+/g, '_');
    return `UNI_ITEMS.CATEGORY.${normalized}`;
  }
}
