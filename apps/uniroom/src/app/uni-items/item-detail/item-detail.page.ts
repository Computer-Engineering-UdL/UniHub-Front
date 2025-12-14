import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { Item } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';
import { LocalizationService } from '../../services/localization.service';
import { MessageService } from '../../services/message.service';
import { TranslateService } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';

// Register Swiper web components
register();

interface UniItemDetailViewModel extends Item {
  priceFormatted: string;
  updatedLabel?: string;
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

  item: UniItemDetailViewModel | null = null;
  loading: boolean = true;
  contacting: boolean = false;

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
      const response = await firstValueFrom(this.uniItemsService.getItemById(id));
      this.item = {
        ...response,
        priceFormatted: this.localization.formatPrice(response.price, response.currency),
        updatedLabel: response.updatedAt ? this.localization.formatRelativeTime(response.updatedAt) : undefined
      };
    } catch (error) {
      console.error('Error loading item', error);
      this.notificationService.error('UNI_ITEMS.DETAIL.ERROR');
    } finally {
      this.loading = false;
    }
  }

  async contactSeller(): Promise<void> {
    if (!this.item) {
      return;
    }

    if (!this.authService.currentUser) {
      await this.router.navigate(['/login']);
      return;
    }

    this.contacting = true;
    try {
      await firstValueFrom(this.messageService.createConversation(this.item.ownerId, undefined, this.item.id));
      this.notificationService.success('UNI_ITEMS.DETAIL.CONTACT_SUCCESS');
      await this.router.navigate(['/messages']);
    } catch (error) {
      console.error('Error contacting seller', error);
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
    } catch (error) {
      console.error('Error deleting item', error);
      this.notificationService.error('UNI_ITEMS.DETAIL.DELETE_ERROR');
    }
  }

  editItem(): void {
    if (!this.item) {
      return;
    }
    void this.router.navigate(['/items', this.item.id, 'edit']);
  }
}
