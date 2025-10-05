import { inject, Injectable } from '@angular/core';
import { Language, TranslateService } from '@ngx-translate/core';

export type LangCode = 'en' | 'es' | 'ca';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private translate: TranslateService = inject(TranslateService);

  private defaultLang: LangCode = 'en';
  private LANG_KEY: string = 'lang';

  changeLanguage(lang: LangCode | string): void {
    this.translate.use(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  getCurrentLanguage(): Language {
    return (
      localStorage.getItem(this.LANG_KEY) ||
      this.translate.getCurrentLang() ||
      this.translate.getBrowserLang() ||
      this.defaultLang
    );
  }
}
