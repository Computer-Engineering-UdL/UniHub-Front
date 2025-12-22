import { Component, inject } from '@angular/core';
import { LocalizationService } from './services/localization.service';
import { AuthService } from './services/auth.service';
import { MessageService } from './services/message.service';
import { AvatarCacheService } from './services/avatar-cache.service';
import { TermsService } from "./services/terms.service";
import { ModalController } from "@ionic/angular";
import { LatestTermsStatus } from "./models/terms.types";
import { TermsAcceptanceModal } from "./shared/terms-acceptance.modal";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly avatarCacheService: AvatarCacheService = inject(AvatarCacheService);
  private readonly termsService: TermsService = inject(TermsService);
  private readonly modalCtrl: ModalController = inject(ModalController);

  constructor() {
    inject(MessageService);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await Promise.all([
      this.localizationService.syncLanguage(),
      this.authService.initialize(),
      this.avatarCacheService.init()
    ]);

    void this.avatarCacheService.clearExpiredCache();
    await this.checkTermsAcceptance();
  }

  private async checkTermsAcceptance(): Promise<void> {
    try {
      const isAuthenticated: boolean = await this.authService.isAuthenticated();

      if (!isAuthenticated) {
        return;
      }

      const status: LatestTermsStatus = await this.termsService.checkLatestTermsStatus();

      if (status.accepted_latest || !status.latest_terms_id) {
        return;
      }

      const modal: HTMLIonModalElement = await this.modalCtrl.create({
        component: TermsAcceptanceModal,
        backdropDismiss: false,
        cssClass: 'terms-modal'
      });

      await modal.present();
      const result: any = await modal.onWillDismiss();

      if (!result.data?.accepted) {
        await this.authService.logout();
      }
    } catch {
    }
  }
}
