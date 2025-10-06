import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';

export type LangCode = 'en' | 'es' | 'ca';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private translate: TranslateService = inject(TranslateService);
  private readonly supportedLanguages: ReadonlyArray<LangCode> = ['en', 'es', 'ca'];
  private readonly defaultLanguage: LangCode = 'en';
  private readonly LANG_KEY: string = 'lang';

  async init(): Promise<void> {
    this.translate.addLangs(this.supportedLanguages as string[]);
    this.translate.setFallbackLang(this.defaultLanguage);

    const saved: string | null = localStorage.getItem(this.LANG_KEY);
    const browser: string | undefined = this.translate.getBrowserLang?.();
    const lang: LangCode = this.normalize(saved || browser || this.defaultLanguage);

    localStorage.setItem(this.LANG_KEY, lang);
    await lastValueFrom(this.translate.use(lang));
  }

  changeLanguage(lang: LangCode): void {
    const normalized: LangCode = this.normalize(lang);
    this.translate.use(normalized);
    localStorage.setItem(this.LANG_KEY, normalized);
  }

  getCurrentLanguage(): LangCode {
    return this.normalize(
      localStorage.getItem(this.LANG_KEY) ||
        this.translate.getCurrentLang?.() ||
        this.translate.getBrowserLang?.() ||
        this.defaultLanguage
    );
  }

  syncLanguage(): void {
    const lang: LangCode = this.getCurrentLanguage();
    this.changeLanguage(lang);
  }

  private normalize(v: string): LangCode {
    const tag: string = v.toLowerCase();
    const base: string = tag.split('-')[0];
    return (this.supportedLanguages as readonly string[]).includes(base) ? (base as LangCode) : this.defaultLanguage;
  }
}
