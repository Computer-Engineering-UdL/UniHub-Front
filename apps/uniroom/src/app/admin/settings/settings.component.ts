import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import NotificationService from '../../services/notification.service';

interface SystemSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  maxUploadSizeMb: number;
  sessionTimeoutMinutes: number;
  defaultLanguage: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoModeration: boolean;
  maxImagesPerPost: number;
}

interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  maxLoginAttempts: number;
  accountLockoutMinutes: number;
  twoFactorAuthEnabled: boolean;
}

interface ContentSettings {
  allowAnonymousPosts: boolean;
  requirePostApproval: boolean;
  maxPostLength: number;
  allowExternalLinks: boolean;
  profanityFilterEnabled: boolean;
  minReportThreshold: number;
}

interface NotificationSettings {
  emailFrom: string;
  emailReplyTo: string;
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
}

@Component({
  selector: 'app-admin-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule]
})
export class AdminSettingsComponent implements OnInit {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly alertController: AlertController = inject(AlertController);
  private readonly translate: TranslateService = inject(TranslateService);

  isLoading: boolean = false;
  isSaving: boolean = false;
  selectedTab: string = 'system';

  systemSettings: SystemSettings = {
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    maxUploadSizeMb: 10,
    sessionTimeoutMinutes: 120,
    defaultLanguage: 'auto',
    emailNotifications: true,
    pushNotifications: true,
    autoModeration: false,
    maxImagesPerPost: 10
  };

  securitySettings: SecuritySettings = {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    maxLoginAttempts: 5,
    accountLockoutMinutes: 30,
    twoFactorAuthEnabled: false
  };

  contentSettings: ContentSettings = {
    allowAnonymousPosts: false,
    requirePostApproval: false,
    maxPostLength: 5000,
    allowExternalLinks: true,
    profanityFilterEnabled: true,
    minReportThreshold: 3
  };

  notificationSettings: NotificationSettings = {
    emailFrom: 'noreply@unihub.smuks.dev',
    emailReplyTo: 'support@unihub.smuks.dev',
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: ''
  };

  availableLanguages: Array<{ code: string; name: string }> = [
    { code: 'auto', name: this.translate.instant('ADMIN.TERMS.AUTO') },
    { code: 'ca', name: this.translate.instant('ADMIN.TERMS.CATALAN') },
    { code: 'es', name: this.translate.instant('ADMIN.TERMS.SPANISH') },
    { code: 'en', name: this.translate.instant('ADMIN.TERMS.ENGLISH') }
  ];

  ngOnInit(): void {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    this.isLoading = true;
    try {
      const settings = await this.apiService.get<any>('admin/settings').toPromise();
      if (settings) {
        if (settings.system) this.systemSettings = { ...this.systemSettings, ...settings.system };
        if (settings.security) this.securitySettings = { ...this.securitySettings, ...settings.security };
        if (settings.content) this.contentSettings = { ...this.contentSettings, ...settings.content };
        if (settings.notifications)
          this.notificationSettings = { ...this.notificationSettings, ...settings.notifications };
      }
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.LOAD_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  async saveSettings(): Promise<void> {
    this.isSaving = true;
    try {
      const payload: any = {
        system: this.systemSettings,
        security: this.securitySettings,
        content: this.contentSettings,
        notifications: this.notificationSettings
      };

      await this.apiService.put('admin/settings', payload).toPromise();
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.SAVED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.SAVE_FAILED');
    } finally {
      this.isSaving = false;
    }
  }

  async resetToDefaults(): Promise<void> {
    const confirm: boolean = await this.showConfirmDialog('ADMIN.SETTINGS.CONFIRM.RESET_DEFAULTS');
    if (!confirm) return;

    this.systemSettings = {
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
      maxUploadSizeMb: 10,
      sessionTimeoutMinutes: 120,
      defaultLanguage: 'ca',
      emailNotifications: true,
      pushNotifications: true,
      autoModeration: false,
      maxImagesPerPost: 10
    };

    this.securitySettings = {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: false,
      maxLoginAttempts: 5,
      accountLockoutMinutes: 30,
      twoFactorAuthEnabled: false
    };

    this.contentSettings = {
      allowAnonymousPosts: false,
      requirePostApproval: false,
      maxPostLength: 5000,
      allowExternalLinks: true,
      profanityFilterEnabled: true,
      minReportThreshold: 3
    };

    this.notificationService.success('ADMIN.SETTINGS.SUCCESS.RESET');
  }

  async testEmailSettings(): Promise<void> {
    try {
      const currentUser = await firstValueFrom(this.authService.currentUser$);
      await this.apiService
        .post('admin/settings/test-email', {
          email: currentUser?.email
        })
        .toPromise();
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.EMAIL_TEST_SENT');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.EMAIL_TEST_FAILED');
    }
  }

  async clearCache(): Promise<void> {
    const confirm: boolean = await this.showConfirmDialog('ADMIN.SETTINGS.CONFIRM.CLEAR_CACHE');
    if (!confirm) return;

    try {
      await lastValueFrom(this.apiService.post('admin/cache/clear', {}));
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.CACHE_CLEARED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.CACHE_CLEAR_FAILED');
    }
  }

  async exportSettings(): Promise<void> {
    try {
      const settings: any = {
        system: this.systemSettings,
        security: this.securitySettings,
        content: this.contentSettings,
        notifications: this.notificationSettings,
        exportDate: new Date().toISOString()
      };

      const blob: Blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url: string = globalThis.URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `unihub-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      globalThis.URL.revokeObjectURL(url);

      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.EXPORTED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.EXPORT_FAILED');
    }
  }

  async importSettings(event: Event): Promise<void> {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file: File = input.files[0];

    try {
      const content: string = await file.text();
      const settings: any = JSON.parse(content);

      if (settings.system) this.systemSettings = { ...this.systemSettings, ...settings.system };
      if (settings.security) this.securitySettings = { ...this.securitySettings, ...settings.security };
      if (settings.content) this.contentSettings = { ...this.contentSettings, ...settings.content };
      if (settings.notifications)
        this.notificationSettings = { ...this.notificationSettings, ...settings.notifications };

      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.IMPORTED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.IMPORT_FAILED');
    } finally {
      input.value = '';
    }
  }

  private async showConfirmDialog(messageKey: string): Promise<boolean> {
    const message: string = await firstValueFrom(this.translate.get(messageKey));
    const cancelText: string = await firstValueFrom(this.translate.get('COMMON.CANCEL'));
    const confirmText: string = await firstValueFrom(this.translate.get('COMMON.CONFIRM'));

    const alert = await this.alertController.create({
      header: await firstValueFrom(this.translate.get('COMMON.CONFIRM_ACTION')),
      message,
      buttons: [
        {
          text: cancelText,
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: confirmText,
          role: 'confirm',
          cssClass: 'alert-button-confirm'
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  changeTab(tab: string): void {
    this.selectedTab = tab;
  }
}
