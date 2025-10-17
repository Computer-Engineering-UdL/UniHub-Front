import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { OfferListItem } from '../models/offer.types';
import { User } from '../models/auth.types';
import { CreateOfferModalComponent } from './create-offer-modal/create-offer-modal.component';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss'],
  standalone: false
})
export class RoomsComponent implements OnInit {
  public offers: OfferListItem[] = [];
  public user: User | null = null;
  public canCreateOffer: boolean = false;

  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);
  private modalController: ModalController = inject(ModalController);

  async ngOnInit(): Promise<void> {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
      this.canCreateOffer = user?.role === 'Seller' || user?.role === 'Admin';
    });

    await this.loadOffers();
  }

  private async loadOffers(): Promise<void> {
    try {
      this.offers = await firstValueFrom(this.apiService.get<OfferListItem[]>('offers/offers/'));
      this.fillMissingOfferImages();
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  }

  private fillMissingOfferImages(): void {
    const placeholderImages: string[] = [
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ];

    this.offers.forEach((offer: any, index: number) => {
      if (!offer.image) {
        offer.image = placeholderImages[index % placeholderImages.length];
      }
    });
  }

  async openCreateOfferModal(): Promise<void> {
    const modal = await this.modalController.create({
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
