import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';

export type LangCode = 'en' | 'es' | 'ca';
export type TNumber = number | string; // accepted input types for formatting
export type TDateInput = Date | string | number | null | undefined;

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

  /**
   * Map internal language code to a more specific locale string used by Intl.
   * You can extend the mapping if you need different region variants.
   */
  getLocale(): string {
    const lang: 'en' | 'es' | 'ca' = this.getCurrentLanguage();
    switch (lang) {
      case 'es':
        return 'es-ES';
      case 'ca':
        return 'ca-ES';
      case 'en':
      default:
        return 'en-US';
    }
  }

  /**
   * Derive decimal and a thousand separators for the current locale.
   */
  getNumberSeparators(): { decimal: string; thousand: string } {
    try {
      const locale: string = this.getLocale();
      const parts: Intl.NumberFormatPart[] = new Intl.NumberFormat(locale).formatToParts(1000.5);
      let decimal: string = '.';
      let thousand: string = ',';
      for (const p of parts) {
        if (p.type === 'decimal') {
          decimal = p.value;
        }
        if (p.type === 'group') {
          thousand = p.value;
        }
      }
      return { decimal, thousand };
    } catch {
      return { decimal: '.', thousand: ',' };
    }
  }

  // Trim trailing zeros from fraction parts; returns a new parts array
  private trimTrailingZerosInParts(parts: Intl.NumberFormatPart[]): Intl.NumberFormatPart[] {
    const p = parts.map((x) => ({ ...x }));
    const fractionIndex: number = p.findIndex((part) => part.type === 'fraction');
    if (fractionIndex < 0) {
      return p;
    }

    const frac: string = p[fractionIndex].value;
    const trimmed: string = frac.replace(/0+$/, '');
    if (trimmed.length > 0) {
      p[fractionIndex].value = trimmed;
      return p;
    }

    p.splice(fractionIndex, 1);
    const decimalIndex: number = p.findIndex((part) => part.type === 'decimal');
    if (decimalIndex >= 0) {
      p.splice(decimalIndex, 1);
    }
    return p;
  }

  private toNumber(value: TNumber): number {
    if (typeof value === 'number') {
      return value;
    }
    return Number(String(value).trim());
  }

  /**
   * Format a plain number according to locale with optional max fraction digits.
   * Returns a string.
   * If value is invalid, returns an em dash.
   * If removeTrailingZeros is true (default), then trailing zeros in the fractional part are removed
   */
  formatNumber(value: TNumber, maxFractionDigits = 2, removeTrailingZeros = true): string {
    const num: number = this.toNumber(value);
    if (!isFinite(num)) {
      return '—';
    }
    const locale: string = this.getLocale();

    try {
      if (!removeTrailingZeros) {
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: maxFractionDigits,
          maximumFractionDigits: maxFractionDigits
        }).format(num);
      }

      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits
      });
      const parts: Intl.NumberFormatPart[] = formatter.formatToParts(num);
      return this.trimTrailingZerosInParts(parts)
        .map((p) => p.value)
        .join('');
    } catch {
      return String(value);
    }
  }

  /**
   * Format a price using the locale and provided currency (default EUR).
   * Optional maxFractionDigits and removeTrailingZeros control fractional behavior.
   */
  formatPrice(value: TNumber, currency: string = 'EUR', maxFractionDigits = 2, removeTrailingZeros = true): string {
    const num: number = this.toNumber(value);
    if (!isFinite(this.toNumber(value))) {
      return '—';
    }
    const locale: string = this.getLocale();

    try {
      const baseFormatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
      const defaultMin: number = baseFormatter.resolvedOptions().minimumFractionDigits ?? 0;

      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: maxFractionDigits,
        minimumFractionDigits: removeTrailingZeros ? 0 : defaultMin
      });

      if (!removeTrailingZeros) {
        return formatter.format(num);
      }

      const parts: Intl.NumberFormatPart[] = formatter.formatToParts(num);
      return this.trimTrailingZerosInParts(parts)
        .map((p) => p.value)
        .join('');
    } catch {
      return `${this.formatNumber(num, maxFractionDigits, removeTrailingZeros)} ${currency}`;
    }
  }

  /** Try to convert any input into a valid Date object. */
  private toDate(input: TDateInput): Date | null {
    if (input == null) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    const s = String(input).trim();
    // Allow ISO or epoch
    const asNumber = Number(s);
    const d =
      isFinite(asNumber) && s !== '' && /^(\d{10}|\d{13})$/.test(s)
        ? new Date(asNumber.toString().length === 10 ? asNumber * 1000 : asNumber)
        : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Format only date (no time) using current locale. */
  formatDate(input: TDateInput, options?: Intl.DateTimeFormatOptions): string {
    const d = this.toDate(input);
    if (!d) return '—';
    const locale = this.getLocale();
    // default: e.g., 18 Oct 2025 (dependiendo de locale)
    const fmt: Intl.DateTimeFormatOptions = options ?? { year: 'numeric', month: 'short', day: '2-digit' };
    try {
      return new Intl.DateTimeFormat(locale, fmt).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  /** Format date and time using current locale. */
  formatDateTime(input: TDateInput, options?: Intl.DateTimeFormatOptions): string {
    const d = this.toDate(input);
    if (!d) return '—';
    const locale = this.getLocale();
    // default: include hours and minutes in 2-digit format
    const fmt: Intl.DateTimeFormatOptions = options ?? {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    try {
      return new Intl.DateTimeFormat(locale, fmt).format(d);
    } catch {
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    }
  }
}
