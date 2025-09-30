import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);

  constructor() {
    // Set default language
    this.translate.setDefaultLang('en');

    // Try to get browser language
    const browserLang = this.translate.getBrowserLang();
    const supportedLangs = ['en', 'es', 'ca'];
    const langToUse =
      browserLang && supportedLangs.includes(browserLang) ? browserLang : 'en';

    this.translate.use(langToUse);
  }
}
