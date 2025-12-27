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
type SettingStatus = 'stable' | 'beta' | 'coming-soon';

interface SettingConfig<T extends SettingValue = SettingValue> {
  value: T;
  status?: SettingStatus;
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
    maintenanceMode: { value: false, status: 'stable' },
    allowNewRegistrations: { value: true, status: 'stable' },
    requireEmailVerification: { value: true, status: 'stable' },
    maxUploadSizeMb: { value: 10, status: 'stable' },
    sessionTimeoutMinutes: { value: 120, status: 'stable' },
    defaultLanguage: { value: 'auto', status: 'stable' },
    emailNotifications: { value: true, status: 'stable' },
    pushNotifications: { value: true, status: 'beta' },
    autoModeration: { value: false, status: 'beta' },
    maxImagesPerPost: { value: 10, status: 'stable' }
  };

  securitySettings: SecuritySettings = {
    passwordMinLength: { value: 8, status: 'stable' },
    passwordRequireUppercase: { value: true, status: 'stable' },
    passwordRequireNumbers: { value: true, status: 'stable' },
    passwordRequireSpecialChars: { value: false, status: 'stable' },
    maxLoginAttempts: { value: 5, status: 'stable' },
    accountLockoutMinutes: { value: 30, status: 'stable' },
    twoFactorAuthEnabled: { value: false, status: 'coming-soon' }
  };

  contentSettings: ContentSettings = {
    requirePostApproval: { value: false, status: 'beta' },
    maxPostLength: { value: 5000, status: 'stable' },
    allowExternalLinks: { value: true, status: 'stable' },
    profanityFilterEnabled: { value: true, status: 'beta' },
    minReportThreshold: { value: 3, status: 'stable' }
  };

  DEFAULT_NO_REPLY_EMAIL: string = 'noreply@unihub.smuks.dev';
  DEFAULT_SUPPORT_EMAIL: string = 'support@unihub.smuks.dev';

  notificationSettings: NotificationSettings = {
    emailFrom: { value: this.DEFAULT_NO_REPLY_EMAIL, status: 'stable' },
    emailReplyTo: { value: this.DEFAULT_SUPPORT_EMAIL, status: 'stable' },
    smtpServer: { value: 'smtp.gmail.com', status: 'stable' },
    smtpPort: { value: 587, status: 'stable' },
    smtpUsername: { value: '', status: 'stable' },
    smtpPassword: { value: '', status: 'stable' }
  };

  availableLanguages: Array<LanguageOption> = [
    { code: 'auto', name: this.translate.instant('ADMIN.TERMS.AUTO') },
    { code: 'ca', name: this.translate.instant('ADMIN.TERMS.CATALAN') },
    { code: 'es', name: this.translate.instant('ADMIN.TERMS.SPANISH') },
    { code: 'en', name: this.translate.instant('ADMIN.TERMS.ENGLISH') }
  ];

  ngOnInit(): void {
    void this.loadSettings();
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
      maintenanceMode: { value: false, status: 'stable' },
      allowNewRegistrations: { value: true, status: 'stable' },
      requireEmailVerification: { value: true, status: 'stable' },
      maxUploadSizeMb: { value: 10, status: 'stable' },
      sessionTimeoutMinutes: { value: 120, status: 'stable' },
      defaultLanguage: { value: 'ca', status: 'stable' },
      emailNotifications: { value: true, status: 'stable' },
      pushNotifications: { value: true, status: 'beta' },
      autoModeration: { value: false, status: 'beta' },
      maxImagesPerPost: { value: 10, status: 'stable' }
    };

    this.securitySettings = {
      passwordMinLength: { value: 8, status: 'stable' },
      passwordRequireUppercase: { value: true, status: 'stable' },
      passwordRequireNumbers: { value: true, status: 'stable' },
      passwordRequireSpecialChars: { value: false, status: 'stable' },
      maxLoginAttempts: { value: 5, status: 'stable' },
      accountLockoutMinutes: { value: 30, status: 'stable' },
      twoFactorAuthEnabled: { value: false, status: 'coming-soon' }
    };

    this.contentSettings = {
      requirePostApproval: { value: false, status: 'beta' },
      maxPostLength: { value: 5000, status: 'stable' },
      allowExternalLinks: { value: true, status: 'stable' },
      profanityFilterEnabled: { value: true, status: 'beta' },
      minReportThreshold: { value: 3, status: 'stable' }
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
