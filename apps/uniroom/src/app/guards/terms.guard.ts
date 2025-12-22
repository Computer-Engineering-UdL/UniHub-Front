import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { TermsService } from '../services/terms.service';
import { LatestTermsStatus, Terms } from '../models/terms.types';
import { TermsAcceptanceModal } from '../shared/terms-acceptance.modal';

export const termsGuard: CanActivateFn = async (): Promise<boolean> => {
  const authService: AuthService = inject(AuthService);
  const termsService: TermsService = inject(TermsService);
  const modalCtrl: ModalController = inject(ModalController);
  const router: Router = inject(Router);

  const isAuthenticated: boolean = await authService.isAuthenticated();

  if (!isAuthenticated) {
    return true;
  }

  try {
    const status: LatestTermsStatus = await termsService.checkLatestTermsStatus();

    if (status.accepted_latest) {
      return true;
    }

    if (!status.latest_terms_id) {
      return true;
    }

    const latestTerms: Terms = await termsService.getTermsById(status.latest_terms_id);

    if (!latestTerms.is_active) {
      return true;
    }

    const modal: HTMLIonModalElement = await modalCtrl.create({
      component: TermsAcceptanceModal,
      backdropDismiss: false,
      cssClass: 'terms-modal'
    });

    await modal.present();
    const result: any = await modal.onWillDismiss();

    if (result.data?.accepted) {
      return true;
    } else {
      await authService.logout();
      await router.navigate(['/login']);
      return false;
    }
  } catch {
    return true;
  }
};
