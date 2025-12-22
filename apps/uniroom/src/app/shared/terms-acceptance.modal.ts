import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TermsService } from '../services/terms.service';
import { Terms, LatestTermsStatus, TermsContent } from '../models/terms.types';
import NotificationService from '../services/notification.service';
import { clearTermsCache } from '../guards/terms.guard';

@Component({
  selector: 'app-terms-acceptance-modal',
  templateUrl: './terms-acceptance.modal.html',
  styleUrls: ['./terms-acceptance.modal.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule]
})
export class TermsAcceptanceModal implements OnInit {
  terms: Terms | null = null;
  termsContent: string = '';
  loading: boolean = true;
  accepting: boolean = false;
  scrolledToBottom: boolean = false;
  hasScroll: boolean = false;

  private readonly termsService: TermsService = inject(TermsService);
  private readonly modalCtrl: ModalController = inject(ModalController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translateService: TranslateService = inject(TranslateService);

  ngOnInit(): void {
    void this.loadLatestTerms();
  }

  async loadLatestTerms(): Promise<void> {
    this.loading = true;
    try {
      const status: LatestTermsStatus = await this.termsService.checkLatestTermsStatus();

      if (status.latest_terms_id) {
        this.terms = await this.termsService.getTermsById(status.latest_terms_id);
        this.setTermsContent();
        setTimeout(() => this.checkIfScrollNeeded(), 100);
      }
    } catch {
      this.notificationService.error('TERMS.ERROR_LOADING');
      await this.modalCtrl.dismiss({ accepted: false });
    } finally {
      this.loading = false;
    }
  }

  setTermsContent(): void {
    if (!this.terms) {
      return;
    }

    const currentLang: string = this.translateService.currentLang || 'ca';

    try {
      const parsedContent: TermsContent = JSON.parse(this.terms.content);

      if (currentLang === 'ca' && parsedContent.ca) {
        this.termsContent = parsedContent.ca;
      } else if (currentLang === 'es' && parsedContent.es) {
        this.termsContent = parsedContent.es;
      } else if (currentLang === 'en' && parsedContent.en) {
        this.termsContent = parsedContent.en;
      } else {
        this.termsContent = parsedContent.ca || parsedContent.es || parsedContent.en || this.terms.content;
      }
    } catch {
      this.termsContent = this.terms.content;
    }
  }

  checkIfScrollNeeded(): void {
    const element: HTMLElement | null = document.querySelector('.scrollable-content');
    if (element) {
      this.hasScroll = element.scrollHeight > element.clientHeight;
      if (!this.hasScroll) {
        this.scrolledToBottom = true;
      }
    }
  }

  onScroll(event: any): void {
    const element: HTMLElement = event.target;
    const threshold: number = 10;

    this.scrolledToBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }

  async accept(): Promise<void> {
    this.accepting = true;
    try {
      await this.termsService.acceptLatestTerms();
      clearTermsCache();
      this.notificationService.success('TERMS.ACCEPTED_SUCCESS');
      await this.modalCtrl.dismiss({ accepted: true });
    } catch {
      this.notificationService.error('TERMS.ACCEPT_ERROR');
    } finally {
      this.accepting = false;
    }
  }

  async decline(): Promise<void> {
    await this.modalCtrl.dismiss({ accepted: false });
  }
}
