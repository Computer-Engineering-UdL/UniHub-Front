import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { LocalizationService } from './services/localization.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  private localizationService: LocalizationService = inject(LocalizationService);
  private themeService = inject(ThemeService);

  constructor() {
    this.localizationService.syncLanguage();
  }
}
