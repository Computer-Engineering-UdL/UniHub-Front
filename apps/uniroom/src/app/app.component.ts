import { Component, inject } from '@angular/core';
import { LocalizationService } from './services/localization.service';
import { AuthService } from './services/auth.service';
import { MessageService } from './services/message.service';
import { AvatarCacheService } from './services/avatar-cache.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly avatarCacheService: AvatarCacheService = inject(AvatarCacheService);

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await Promise.all([
      this.localizationService.syncLanguage(),
      this.authService.initialize(),
      this.avatarCacheService.init()
    ]);

    void this.avatarCacheService.clearExpiredCache();
  }
}
