import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { TermsService } from '../services/terms.service';
import { LatestTermsStatus } from '../models/terms.types';
import { TermsAcceptanceModal } from '../shared/terms-acceptance.modal';

let termsCheckCache: { status: LatestTermsStatus; timestamp: number } | null = null;
const CACHE_DURATION: number = 5 * 60 * 1000;

export function clearTermsCache(): void {
  termsCheckCache = null;
}

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
    const now: number = Date.now();
    let status: LatestTermsStatus;

    if (termsCheckCache && (now - termsCheckCache.timestamp) < CACHE_DURATION) {
      status = termsCheckCache.status;
    } else {
      status = await termsService.checkLatestTermsStatus();
      termsCheckCache = { status, timestamp: now };
    }

    if (status.accepted_latest) {
      return true;
    }

    if (!status.latest_terms_id) {
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
      clearTermsCache();
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
