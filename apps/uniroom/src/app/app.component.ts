import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { LocalizationService } from './services/localization.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  private localizationService: LocalizationService = inject(LocalizationService);
  private themeService: ThemeService = inject(ThemeService);
  private authService: AuthService = inject(AuthService);

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await Promise.all([this.localizationService.syncLanguage(), this.authService.initialize()]);
  }
}
