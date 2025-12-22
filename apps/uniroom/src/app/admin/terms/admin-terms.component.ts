import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TermsService } from '../../services/terms.service';
import { CreateTermsDto, Terms, TermsContent, TermsFormData, UpdateTermsDto } from '../../models/terms.types';
import NotificationService from '../../services/notification.service';
import { LangCode, LocalizationService } from '../../services/localization.service';
import { clearTermsCache } from '../../guards/terms.guard';

@Component({
  selector: 'app-admin-terms',
  templateUrl: './admin-terms.component.html',
  styleUrls: ['./admin-terms.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class AdminTermsComponent implements OnInit {
  latestTerm: Terms | null = null;
  parsedContent: TermsContent = {};
  loading: boolean = false;
  selectedLang: string = 'ca';

  private readonly termsService: TermsService = inject(TermsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly alertCtrl: AlertController = inject(AlertController);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly translateService: TranslateService = inject(TranslateService);

  ngOnInit(): void {
    void this.loadTerms();
  }

  private parseTermsContent(content: string): TermsContent {
    try {
      return JSON.parse(content);
    } catch {
      return { ca: content, es: content, en: content };
    }
  }

  private serializeTermsContent(data: TermsFormData): string {
    const content: TermsContent = {};
    if (data.content_ca?.trim()) {
      content.ca = data.content_ca.trim();
    }
    if (data.content_es?.trim()) {
      content.es = data.content_es.trim();
    }
    if (data.content_en?.trim()) {
      content.en = data.content_en.trim();
    }
    return JSON.stringify(content);
  }

  getContentForLanguage(lang: LangCode): string {
    return this.parsedContent[lang as keyof TermsContent] || '';
  }

  async loadTerms(): Promise<void> {
    this.loading = true;
    try {
      const terms: Terms[] = await this.termsService.getAllTerms();
      if (terms.length > 0) {
        terms.sort((a: Terms, b: Terms): number => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestTermSummary: Terms = terms[0];

        this.latestTerm = await this.termsService.getTermsById(latestTermSummary.id);
        this.parsedContent = this.parseTermsContent(this.latestTerm.content);
      } else {
        this.latestTerm = null;
        this.parsedContent = {};
      }
    } catch {
      this.notificationService.error('ADMIN.TERMS.ERROR_LOADING');
    } finally {
      this.loading = false;
    }
  }

  async openCreateModal(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.CREATE_TITLE'),
      message: this.translateService.instant('ADMIN.TERMS.CREATE_MESSAGE'),
      cssClass: 'wide-alert',
      inputs: [
        {
          name: 'version',
          type: 'text',
          label: this.translateService.instant('ADMIN.TERMS.VERSION_LABEL'),
          placeholder: this.translateService.instant('ADMIN.TERMS.VERSION_PLACEHOLDER')
        },
        {
          name: 'content_ca',
          type: 'textarea',
          label: this.translateService.instant('ADMIN.TERMS.CONTENT_CA_LABEL'),
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_CA_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        },
        {
          name: 'content_es',
          type: 'textarea',
          label: this.translateService.instant('ADMIN.TERMS.CONTENT_ES_LABEL'),
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_ES_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        },
        {
          name: 'content_en',
          type: 'textarea',
          label: this.translateService.instant('ADMIN.TERMS.CONTENT_EN_LABEL'),
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_EN_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.CREATE'),
          handler: async (data: TermsFormData): Promise<boolean> => {
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

  async createTerms(data: TermsFormData): Promise<void> {
    this.loading = true;
    try {
      const contentString: string = this.serializeTermsContent(data);

      const createPayload: CreateTermsDto = {
        version: data.version.trim(),
        content: contentString
      };

      await this.termsService.createTerms(createPayload);

      clearTermsCache();
      this.notificationService.success('ADMIN.TERMS.CREATE_SUCCESS');
      await this.loadTerms();
    } catch {
      this.notificationService.error('ADMIN.TERMS.CREATE_ERROR');
    } finally {
      this.loading = false;
    }
  }

  async editTerms(term: Terms): Promise<void> {
    const parsedContent: TermsContent = this.parseTermsContent(term.content);

    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.EDIT_TITLE'),
      cssClass: 'wide-alert',
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
          value: parsedContent.ca || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_CA_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        },
        {
          name: 'content_es',
          type: 'textarea',
          value: parsedContent.es || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_ES_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        },
        {
          name: 'content_en',
          type: 'textarea',
          value: parsedContent.en || '',
          placeholder: this.translateService.instant('ADMIN.TERMS.CONTENT_EN_PLACEHOLDER'),
          attributes: {
            rows: 10
          }
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.SAVE'),
          handler: async (data: TermsFormData): Promise<boolean> => {
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

  async updateTerms(termsId: string, data: TermsFormData): Promise<void> {
    this.loading = true;
    try {
      const currentVersion: string = this.latestTerm?.version || '';
      const newVersion: string = data.version.trim();
      const versionChanged: boolean = currentVersion !== newVersion;

      if (versionChanged) {
        const shouldRecreate: boolean = await this.askIfShouldRecreateTerms(newVersion);

        if (shouldRecreate) {
          await this.recreateTerms(termsId, data);
        } else {
          await this.patchTerms(termsId, data);
        }
      } else {
        await this.patchTerms(termsId, data);
      }

      clearTermsCache();
      this.notificationService.success('ADMIN.TERMS.UPDATE_SUCCESS');
      await this.loadTerms();
    } catch {
      this.notificationService.error('ADMIN.TERMS.UPDATE_ERROR');
    } finally {
      this.loading = false;
    }
  }

  private async askIfShouldRecreateTerms(newVersion: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      void (async (): Promise<void> => {
        const alert: HTMLIonAlertElement = await this.alertCtrl.create({
          header: this.translateService.instant('ADMIN.TERMS.VERSION_CHANGED_TITLE'),
          message: this.translateService.instant('ADMIN.TERMS.VERSION_CHANGED_MESSAGE', { version: newVersion }),
          cssClass: 'custom-alert',
          buttons: [
            {
              text: this.translateService.instant('ADMIN.TERMS.KEEP_ACCEPTANCES'),
              role: 'cancel',
              handler: (): void => {
                resolve(false);
              }
            },
            {
              text: this.translateService.instant('ADMIN.TERMS.REQUIRE_NEW_ACCEPTANCE'),
              handler: (): void => {
                resolve(true);
              }
            }
          ]
        });
        await alert.present();
      })();
    });
  }

  private async patchTerms(termsId: string, data: TermsFormData): Promise<void> {
    const contentString: string = this.serializeTermsContent(data);

    const payload: UpdateTermsDto = {
      version: data.version.trim(),
      content: contentString
    };

    await this.termsService.updateTerms(termsId, payload);
  }

  private async recreateTerms(termsId: string, data: TermsFormData): Promise<void> {
    await this.termsService.deleteTerms(termsId);

    const contentString: string = this.serializeTermsContent(data);

    const createPayload: CreateTermsDto = {
      version: data.version.trim(),
      content: contentString
    };

    await this.termsService.createTerms(createPayload);
  }

  async deleteTerms(term: Terms): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ADMIN.TERMS.DELETE_CONFIRM_TITLE'),
      message: this.translateService.instant('ADMIN.TERMS.DELETE_CONFIRM_MESSAGE'),
      cssClass: 'custom-delete-alert',
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.DELETE'),
          role: 'destructive',
          cssClass: 'danger-btn',
          handler: async (): Promise<void> => {
            this.loading = true;
            try {
              await this.termsService.deleteTerms(term.id);
              clearTermsCache();
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
