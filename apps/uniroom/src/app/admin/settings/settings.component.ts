import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import NotificationService from '../../services/notification.service';

type SettingValue = boolean | number | string;

interface SettingConfig<T extends SettingValue = SettingValue> {
  value: T;
  isBeta?: boolean;
}

interface SystemSettings {
  maintenanceMode: SettingConfig<boolean>;
  allowNewRegistrations: SettingConfig<boolean>;
  requireEmailVerification: SettingConfig<boolean>;
  maxUploadSizeMb: SettingConfig<number>;
  sessionTimeoutMinutes: SettingConfig<number>;
  defaultLanguage: SettingConfig<string>;
  emailNotifications: SettingConfig<boolean>;
  pushNotifications: SettingConfig<boolean>;
  autoModeration: SettingConfig<boolean>;
  maxImagesPerPost: SettingConfig<number>;
  [key: string]: SettingConfig;
}

interface SecuritySettings {
  passwordMinLength: SettingConfig<number>;
  passwordRequireUppercase: SettingConfig<boolean>;
  passwordRequireNumbers: SettingConfig<boolean>;
  passwordRequireSpecialChars: SettingConfig<boolean>;
  maxLoginAttempts: SettingConfig<number>;
  accountLockoutMinutes: SettingConfig<number>;
  twoFactorAuthEnabled: SettingConfig<boolean>;
  [key: string]: SettingConfig;
}

interface ContentSettings {
  requirePostApproval: SettingConfig<boolean>;
  maxPostLength: SettingConfig<number>;
  allowExternalLinks: SettingConfig<boolean>;
  profanityFilterEnabled: SettingConfig<boolean>;
  minReportThreshold: SettingConfig<number>;
  [key: string]: SettingConfig;
}

interface NotificationSettings {
  emailFrom: SettingConfig<string>;
  emailReplyTo: SettingConfig<string>;
  smtpServer: SettingConfig<string>;
  smtpPort: SettingConfig<number>;
  smtpUsername: SettingConfig<string>;
  smtpPassword: SettingConfig<string>;
  [key: string]: SettingConfig;
}

interface LanguageOption {
  code: string;
  name: string;
}

interface SettingsResponse {
  system?: Partial<Record<keyof SystemSettings, SettingValue>>;
  security?: Partial<Record<keyof SecuritySettings, SettingValue>>;
  content?: Partial<Record<keyof ContentSettings, SettingValue>>;
  notifications?: Partial<Record<keyof NotificationSettings, SettingValue>>;
}

interface SettingsPayload {
  system: Record<string, SettingValue>;
  security: Record<string, SettingValue>;
  content: Record<string, SettingValue>;
  notifications: Record<string, SettingValue>;
}

interface User {
  email?: string;
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
    maintenanceMode: { value: false, isBeta: false },
    allowNewRegistrations: { value: true, isBeta: false },
    requireEmailVerification: { value: true, isBeta: false },
    maxUploadSizeMb: { value: 10, isBeta: false },
    sessionTimeoutMinutes: { value: 120, isBeta: false },
    defaultLanguage: { value: 'auto', isBeta: false },
    emailNotifications: { value: true, isBeta: false },
    pushNotifications: { value: true, isBeta: true },
    autoModeration: { value: false, isBeta: true },
    maxImagesPerPost: { value: 10, isBeta: false }
  };

  securitySettings: SecuritySettings = {
    passwordMinLength: { value: 8, isBeta: false },
    passwordRequireUppercase: { value: true, isBeta: false },
    passwordRequireNumbers: { value: true, isBeta: false },
    passwordRequireSpecialChars: { value: false, isBeta: false },
    maxLoginAttempts: { value: 5, isBeta: false },
    accountLockoutMinutes: { value: 30, isBeta: false },
    twoFactorAuthEnabled: { value: false, isBeta: true }
  };

  contentSettings: ContentSettings = {
    requirePostApproval: { value: false, isBeta: true },
    maxPostLength: { value: 5000, isBeta: false },
    allowExternalLinks: { value: true, isBeta: false },
    profanityFilterEnabled: { value: true, isBeta: true },
    minReportThreshold: { value: 3, isBeta: false }
  };

  DEFAULT_NO_REPLY_EMAIL: string = 'noreply@unihub.smuks.dev';
  DEFAULT_SUPPORT_EMAIL: string = 'support@unihub.smuks.dev';

  notificationSettings: NotificationSettings = {
    emailFrom: { value: this.DEFAULT_NO_REPLY_EMAIL, isBeta: false },
    emailReplyTo: { value: this.DEFAULT_SUPPORT_EMAIL, isBeta: false },
    smtpServer: { value: 'smtp.gmail.com', isBeta: false },
    smtpPort: { value: 587, isBeta: false },
    smtpUsername: { value: '', isBeta: false },
    smtpPassword: { value: '', isBeta: false }
  };

  availableLanguages: Array<LanguageOption> = [
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
      const settings: SettingsResponse | undefined = await firstValueFrom(
        this.apiService.get<SettingsResponse>('admin/settings')
      );
      if (settings) {
        if (settings.system) {
          this.mergeSettings(this.systemSettings, settings.system);
        }
        if (settings.security) {
          this.mergeSettings(this.securitySettings, settings.security);
        }
        if (settings.content) {
          this.mergeSettings(this.contentSettings, settings.content);
        }
        if (settings.notifications) {
          this.mergeSettings(this.notificationSettings, settings.notifications);
        }
      }
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.LOAD_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  private mergeSettings<T extends Record<string, SettingConfig>>(
    target: T,
    source: Partial<Record<keyof T, SettingValue>>
  ): void {
    for (const key in source) {
      if (key in target && key in source) {
        const typedKey = key as keyof T;
        const sourceValue = source[typedKey];
        if (sourceValue !== undefined) {
          (target[typedKey] as SettingConfig).value = sourceValue as SettingValue;
        }
      }
    }
  }

  async saveSettings(): Promise<void> {
    this.isSaving = true;
    try {
      const payload: SettingsPayload = {
        system: this.extractSettingValues(this.systemSettings),
        security: this.extractSettingValues(this.securitySettings),
        content: this.extractSettingValues(this.contentSettings),
        notifications: this.extractSettingValues(this.notificationSettings)
      };

      await firstValueFrom(this.apiService.put('admin/settings', payload));
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.SAVED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.SAVE_FAILED');
    } finally {
      this.isSaving = false;
    }
  }

  private extractSettingValues<T extends Record<string, SettingConfig>>(settings: T): Record<string, SettingValue> {
    const result: Record<string, SettingValue> = {};
    for (const key in settings) {
      if (key in settings) {
        result[key] = settings[key].value;
      }
    }
    return result;
  }

  async resetToDefaults(): Promise<void> {
    const confirm: boolean = await this.showConfirmDialog('ADMIN.SETTINGS.CONFIRM.RESET_DEFAULTS');
    if (!confirm) {
      return;
    }

    this.systemSettings = {
      maintenanceMode: { value: false, isBeta: false },
      allowNewRegistrations: { value: true, isBeta: false },
      requireEmailVerification: { value: true, isBeta: false },
      maxUploadSizeMb: { value: 10, isBeta: false },
      sessionTimeoutMinutes: { value: 120, isBeta: false },
      defaultLanguage: { value: 'ca', isBeta: false },
      emailNotifications: { value: true, isBeta: false },
      pushNotifications: { value: true, isBeta: true },
      autoModeration: { value: false, isBeta: true },
      maxImagesPerPost: { value: 10, isBeta: false }
    };

    this.securitySettings = {
      passwordMinLength: { value: 8, isBeta: false },
      passwordRequireUppercase: { value: true, isBeta: false },
      passwordRequireNumbers: { value: true, isBeta: false },
      passwordRequireSpecialChars: { value: false, isBeta: false },
      maxLoginAttempts: { value: 5, isBeta: false },
      accountLockoutMinutes: { value: 30, isBeta: false },
      twoFactorAuthEnabled: { value: false, isBeta: true }
    };

    this.contentSettings = {
      requirePostApproval: { value: false, isBeta: true },
      maxPostLength: { value: 5000, isBeta: false },
      allowExternalLinks: { value: true, isBeta: false },
      profanityFilterEnabled: { value: true, isBeta: true },
      minReportThreshold: { value: 3, isBeta: false }
    };

    this.notificationService.success('ADMIN.SETTINGS.SUCCESS.RESET');
  }

  async testEmailSettings(): Promise<void> {
    try {
      const currentUser: User | null = await firstValueFrom(this.authService.currentUser$);
      await firstValueFrom(
        this.apiService.post('admin/settings/test-email', {
          email: currentUser?.email
        })
      );
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.EMAIL_TEST_SENT');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.EMAIL_TEST_FAILED');
    }
  }

  async clearCache(): Promise<void> {
    const confirm: boolean = await this.showConfirmDialog('ADMIN.SETTINGS.CONFIRM.CLEAR_CACHE');
    if (!confirm) {
      return;
    }

    try {
      await lastValueFrom(this.apiService.post('admin/cache/clear', {}));
      this.notificationService.success('ADMIN.SETTINGS.SUCCESS.CACHE_CLEARED');
    } catch {
      this.notificationService.error('ADMIN.SETTINGS.ERROR.CACHE_CLEAR_FAILED');
    }
  }

  async exportSettings(): Promise<void> {
    try {
      interface ExportedSettings {
        system: SystemSettings;
        security: SecuritySettings;
        content: ContentSettings;
        notifications: NotificationSettings;
        exportDate: string;
      }

      const settings: ExportedSettings = {
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
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file: File = input.files[0];

    try {
      const content: string = await file.text();
      interface ImportedSettings {
        system?: Partial<SystemSettings>;
        security?: Partial<SecuritySettings>;
        content?: Partial<ContentSettings>;
        notifications?: Partial<NotificationSettings>;
      }
      const settings: ImportedSettings = JSON.parse(content);

      if (settings.system) {
        Object.assign(this.systemSettings, settings.system);
      }
      if (settings.security) {
        Object.assign(this.securitySettings, settings.security);
      }
      if (settings.content) {
        Object.assign(this.contentSettings, settings.content);
      }
      if (settings.notifications) {
        Object.assign(this.notificationSettings, settings.notifications);
      }

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
