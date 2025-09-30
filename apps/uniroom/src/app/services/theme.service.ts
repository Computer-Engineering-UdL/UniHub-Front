import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'theme_preference';
  private currentTheme: Theme = 'system';

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = this.getSavedTheme();
    this.setTheme(savedTheme);
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    return saved || 'system';
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem(this.THEME_KEY, theme);

    // Remove all theme classes first
    document.body.classList.remove('ion-palette-dark', 'ion-palette-light');

    if (theme === 'dark') {
      document.body.classList.add('ion-palette-dark');
    } else if (theme === 'light') {
      document.body.classList.add('ion-palette-light');
    }
    // For 'system', no class is added, letting CSS media query handle it
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  toggleTheme(): void {
    const themes: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }
}
