import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'theme_preference';
  private currentTheme: Theme = 'system';
  private mediaQuery: MediaQueryList;

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  private async initializeTheme(): Promise<void> {
    const savedTheme = await this.getSavedTheme();
    this.setTheme(savedTheme);
  }

  private async getSavedTheme(): Promise<Theme> {
    const { value } = await Preferences.get({ key: this.THEME_KEY });
    return (value as Theme) || 'system';
  }

  async setTheme(theme: Theme): Promise<void> {
    this.currentTheme = theme;
    await Preferences.set({ key: this.THEME_KEY, value: theme });
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const isDark = theme === 'dark' || (theme === 'system' && this.mediaQuery.matches);

    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
  }

  private setupSystemThemeListener(): void {
    this.mediaQuery.addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system');
      }
    });
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  async toggleTheme(): Promise<void> {
    const themes: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    await this.setTheme(themes[nextIndex]);
  }
}
