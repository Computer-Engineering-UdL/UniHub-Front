import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { DEFAULT_USER_URL, Interest } from '../../models/auth.types';
import { LocalizationService } from '../../services/localization.service';
import { OfferListItem } from '../../models/offer.types';
import { environment } from '../../../environments/environment';
import { API_VERSION_PATH } from '../../../environments/environment.model';
import { firstValueFrom, Subscription } from 'rxjs';
import { ReportModalComponent } from '../../shared/reports/report-modal.component';
import { ReportCategory, ReportReason } from '../../models/report.types';
import { ReportService } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from '../../services/message.service';

interface PublicUserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  faculty: {
    id: string;
    name: string;
    address: string;
    university: {
      id: string;
      name: string;
    };
  } | null;
  is_verified: boolean;
}

@Component({
  selector: 'app-public-profile',
  templateUrl: './public-profile.page.html',
  styleUrls: ['./public-profile.page.scss'],
  standalone: false
})
export class PublicProfilePage implements OnInit, OnDestroy {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly messageService: MessageService = inject(MessageService);

  user: PublicUserProfile | null = null;
  selectedTab: 'overview' | 'listings' = 'overview';
  avatarSrc: string = DEFAULT_USER_URL;

  userInterests: Interest[] = [];
  userOffers: OfferListItem[] = [];

  loadingProfile: boolean = false;
  loadingInterests: boolean = false;
  loadingOffers: boolean = false;

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params): void => {
      const userId: string | null = params['userId'];
      if (userId) {
        void this.loadUserProfile(userId);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  async loadUserProfile(userId: string): Promise<void> {
    this.loadingProfile = true;
    try {
      const response: PublicUserProfile = await firstValueFrom(
        this.apiService.get<PublicUserProfile>(`user/public/${userId}`)
      );

      if (response) {
        this.user = response;
        this.updateAvatarSrc();
        await this.loadUserInterests(this.user.id);
        await this.loadUserOffers(this.user.id);
      } else {
        this.notificationService.error('PROFILE.ERROR.USER_NOT_FOUND');
        await this.router.navigate(['/home']);
      }
    } catch {
      this.notificationService.error('PROFILE.ERROR.LOAD_PROFILE');
      await this.router.navigate(['/home']);
    } finally {
      this.loadingProfile = false;
    }
  }

  selectTab(tab: 'overview' | 'listings'): void {
    this.selectedTab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getUserDisplayName(): string {
    if (this.user?.first_name && this.user?.last_name) {
      return `${this.user.first_name} ${this.user.last_name}`;
    }
    return this.user?.username || 'User';
  }

  private updateAvatarSrc(): void {
    if (!this.user) {
      this.avatarSrc = DEFAULT_USER_URL;
      return;
    }
    const explicit: string = this.user.avatar_url;
    if (explicit) {
      this.avatarSrc = explicit;
      return;
    }
    const first: string = this.user.first_name?.trim() || '';
    const last: string = this.user.last_name?.trim() || '';
    const full: string =
      first || last ? encodeURIComponent(`${first} ${last}`.trim()) : encodeURIComponent(this.user.username);
    this.avatarSrc = `https://avatar.iran.liara.run/username?username=${full}`;
  }

  onAvatarError(): void {
    this.avatarSrc = DEFAULT_USER_URL;
  }

  private async loadUserInterests(userId: string): Promise<void> {
    try {
      this.loadingInterests = true;
      const response: Interest[] = await firstValueFrom(this.apiService.get<Interest[]>(`interest/user/${userId}`));
      this.userInterests = response || [];
    } catch {
      this.userInterests = [];
    } finally {
      this.loadingInterests = false;
    }
  }

  private async loadUserOffers(userId: string): Promise<void> {
    try {
      this.loadingOffers = true;
      this.userOffers = await firstValueFrom(this.apiService.get<OfferListItem[]>(`offers/user/${userId}`));
      this.formatUserOffers();
    } catch {
      this.userOffers = [];
    } finally {
      this.loadingOffers = false;
    }
  }

  private formatUserOffers(): void {
    this.userOffers.forEach((offer: OfferListItem): void => {
      const rawPrice: number = offer.price ?? 0;
      const currency: string = (offer.currency as string) ?? 'EUR';

      offer.priceFormatted = this.localization.formatPrice(rawPrice, currency);

      const rawArea: number = offer.area ?? 0;
      offer.areaFormatted = this.localization.formatNumber(rawArea, 2);

      const resolvedImage: string | null = this.resolveOfferImage(offer);
      if (resolvedImage) {
        offer.image = resolvedImage;
      } else {
        offer.image = 'https://via.placeholder.com/400x300/e0e0e0/666666?text=No+Image';
      }
    });
  }

  private resolveOfferImage(offer: OfferListItem): string | null {
    if (offer.base_image) {
      const baseImageUrl: string | null = this.resolveBaseImageUrl(offer.base_image);
      if (baseImageUrl) {
        return baseImageUrl;
      }
    }

    if (offer.image) {
      const trimmed: string = offer.image.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
    }

    return null;
  }

  private resolveBaseImageUrl(baseImage: string): string | null {
    if (!baseImage) {
      return null;
    }
    const apiBaseUrl: string = environment.apiUrl.replace(API_VERSION_PATH, '');
    return `${apiBaseUrl}${baseImage}`;
  }

  async navigateToOffer(offer: OfferListItem): Promise<void> {
    await this.router.navigate(['/rooms', 'details', offer.id]);
  }

  async reportUser(): Promise<void> {
    if (!this.user) {
      return;
    }

    if (!this.authService.currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    if (this.user.id === this.authService.currentUser.id) {
      this.notificationService.error('PROFILE.ERROR.CANNOT_REPORT_YOURSELF');
      return;
    }

    const modal = await this.modalController.create({
      component: ReportModalComponent,
      cssClass: 'report-modal',
      componentProps: {
        context: {
          contentType: ReportCategory.USER,
          contentId: this.user.id,
          contentTitle: this.getUserDisplayName(),
          reportedUserId: this.user.id,
          allowedReasons: [
            ReportReason.HARASSMENT,
            ReportReason.HATE_SPEECH,
            ReportReason.INAPPROPRIATE_CONTENT,
            ReportReason.SPAM,
            ReportReason.SCAM_FRAUD,
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
            contentType: ReportCategory.USER,
            contentId: this.user.id,
            reportedUserId: this.user.id,
            reason: data.reason,
            description: data.description
          })
        );
        this.notificationService.success(this.translate.instant('REPORT.SUCCESS'));
      } catch {
        this.notificationService.error(this.translate.instant('REPORT.ERROR'));
      }
    }
  }

  async startConversation(): Promise<void> {
    if (!this.user) {
      return;
    }

    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.notificationService.error('ERROR.NOT_AUTHENTICATED');
      return;
    }

    if (this.user.id === currentUser.id) {
      this.notificationService.error('ROOM.DETAILS.LANDLORD.ERROR.CANNOT_MESSAGE_YOURSELF');
      return;
    }

    try {
      const conversation = await firstValueFrom(this.messageService.getOrCreateConversation(this.user.id));
      await this.router.navigate(['/messages'], { queryParams: { id: conversation.id } });
    } catch {
      this.notificationService.error('MESSAGES.CREATE_ERROR');
    }
  }
}
