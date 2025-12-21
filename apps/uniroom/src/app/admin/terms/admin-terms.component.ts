import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TermsService } from '../../services/terms.service';
import { Terms } from '../../models/terms.types';
import NotificationService from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';

@Component({
  selector: 'app-admin-terms',
  templateUrl: './admin-terms.component.html',
  styleUrls: ['./admin-terms.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class AdminTermsComponent implements OnInit {
  terms: Terms[] = [];
  loading: boolean = false;

  private readonly termsService: TermsService = inject(TermsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly alertCtrl: AlertController = inject(AlertController);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly translateService: TranslateService = inject(TranslateService);

  async ngOnInit(): Promise<void> {
    await this.loadTerms();
  }

  async loadTerms(): Promise<void> {
    this.loading = true;
    try {
      this.terms = await this.termsService.getAllTerms();
      this.terms.sort(
        (a: Terms, b: Terms): number => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch {
      this.notificationService.error('ADMIN.TERMS.ERROR_LOADING');
    } finally {
      this.loading = false;
    }
  }

  async openCreateModal(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.CREATE_TITLE'),
      inputs: [
        {
          name: 'version',
          type: 'text',
          placeholder: this.translateService.instant('ADMIN.TERMS.VERSION_PLACEHOLDER')
        },
        {
          name: 'content_ca',
          type: 'textarea',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_CA_PLACEHOLDER')
        },
        {
          name: 'content_es',
          type: 'textarea',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_ES_PLACEHOLDER')
        },
        {
          name: 'content_en',
          type: 'textarea',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_EN_PLACEHOLDER')
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.CREATE'),
          handler: async (data: {
            version: string;
            content_ca: string;
            content_es: string;
            content_en: string;
          }): Promise<boolean> => {
            if (
              !data.version?.trim() ||
              (!data.content_ca?.trim() && !data.content_es?.trim() && !data.content_en?.trim())
            ) {
              this.notificationService.error('ADMIN.TERMS.VALIDATION_ERROR');
              return false;
            }
            await this.createTerms(data);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async createTerms(data: {
    version: string;
    content_ca: string;
    content_es: string;
    content_en: string;
  }): Promise<void> {
    this.loading = true;
    try {
      const payload: any = {
        version: data.version.trim(),
        content: data.content_en?.trim() || data.content_ca?.trim() || data.content_es?.trim() || ''
      };

      if (data.content_ca?.trim()) {
        payload.content_ca = data.content_ca.trim();
      }
      if (data.content_es?.trim()) {
        payload.content_es = data.content_es.trim();
      }
      if (data.content_en?.trim()) {
        payload.content_en = data.content_en.trim();
      }

      await this.termsService.createTerms(payload);
      this.notificationService.success('ADMIN.TERMS.CREATE_SUCCESS');
      await this.loadTerms();
    } catch (error) {
      this.notificationService.error('ADMIN.TERMS.CREATE_ERROR');
    } finally {
      this.loading = false;
    }
  }

  async toggleActive(term: Terms): Promise<void> {
    const newActiveState: boolean = !term.is_active;

    try {
      await this.termsService.updateTerms(term.id, { is_active: newActiveState });
      term.is_active = newActiveState;
      this.notificationService.success('ADMIN.TERMS.UPDATE_SUCCESS');
    } catch {
      this.notificationService.error('ADMIN.TERMS.UPDATE_ERROR');
    }
  }

  async editTerms(term: Terms): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.EDIT_TITLE'),
      inputs: [
        {
          name: 'version',
          type: 'text',
          value: term.version,
          placeholder: this.translateService.instant('ADMIN.TERMS.VERSION_PLACEHOLDER')
        },
        {
          name: 'content_ca',
          type: 'textarea',
          value: term.content_ca || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_CA_PLACEHOLDER')
        },
        {
          name: 'content_es',
          type: 'textarea',
          value: term.content_es || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_ES_PLACEHOLDER')
        },
        {
          name: 'content_en',
          type: 'textarea',
          value: term.content_en || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_EN_PLACEHOLDER')
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.SAVE'),
          handler: async (data: {
            version: string;
            content_ca: string;
            content_es: string;
            content_en: string;
          }): Promise<boolean> => {
            if (
              !data.version?.trim() ||
              (!data.content_ca?.trim() && !data.content_es?.trim() && !data.content_en?.trim())
            ) {
              this.notificationService.error('ADMIN.TERMS.VALIDATION_ERROR');
              return false;
            }
            await this.updateTerms(term.id, data);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async updateTerms(
    termsId: string,
    data: { version: string; content_ca: string; content_es: string; content_en: string }
  ): Promise<void> {
    this.loading = true;
    try {
      const payload: any = {
        version: data.version.trim(),
        content: data.content_en?.trim() || data.content_ca?.trim() || data.content_es?.trim() || ''
      };

      if (data.content_ca?.trim()) {
        payload.content_ca = data.content_ca.trim();
      }
      if (data.content_es?.trim()) {
        payload.content_es = data.content_es.trim();
      }
      if (data.content_en?.trim()) {
        payload.content_en = data.content_en.trim();
      }

      await this.termsService.updateTerms(termsId, payload);
      this.notificationService.success('ADMIN.TERMS.UPDATE_SUCCESS');
      await this.loadTerms();
    } catch {
      this.notificationService.error('ADMIN.TERMS.UPDATE_ERROR');
    } finally {
      this.loading = false;
    }
  }

  async deleteTerms(term: Terms): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.DELETE_CONFIRM_TITLE'),
      message: this.translateService.instant('ADMIN.TERMS.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async (): Promise<void> => {
            this.loading = true;
            try {
              await this.termsService.deleteTerms(term.id);
              this.notificationService.success('ADMIN.TERMS.DELETE_SUCCESS');
              await this.loadTerms();
            } catch {
              this.notificationService.error('ADMIN.TERMS.DELETE_ERROR');
            } finally {
              this.loading = false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  formatDate(date: string): string {
    return this.localizationService.formatDate(date);
  }
}
