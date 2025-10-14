import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Theme, ThemeService } from '../../services/theme.service';
import { LangCode, LocalizationService } from '../../services/localization.service';
import { filter, map, mergeMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
  standalone: false
})
export class TopBarComponent implements OnInit, OnDestroy {
  showTopBar: boolean = true;
  pageTitle: string = '';
  currentTheme: Theme = 'system';
  currentLanguage: LangCode = 'en';
  currentLangIcon: string = '';
  notificationCount: number = 0; // TODO: Replace with real notification count from service

  private router: Router = inject(Router);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private themeService: ThemeService = inject(ThemeService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private routerSub?: Subscription;

  ngOnInit(): void {
    this.currentTheme = this.themeService.getTheme();
    this.currentLanguage = this.localizationService.getCurrentLanguage();

    this.routerSub = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        mergeMap((route) => route.data)
      )
      .subscribe((data) => {
        this.showTopBar = data['topBar'] !== false;
        this.pageTitle = data['titleKey'] || '';
      });

    this.updateCurrentLangIcon();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }

  changeLanguage(lang: LangCode): void {
    this.localizationService.changeLanguage(lang);
    this.currentLanguage = lang;
    this.updateCurrentLangIcon();
  }

  private updateCurrentLangIcon(): void {
    this.currentLangIcon = this.getCurrentLangIcon();
  }

  private getCurrentLangIcon(): string {
    return `assets/flags/${this.currentLanguage}.png`;
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      case 'system':
        return 'contrast';
      default:
        return 'contrast';
    }
  }

  openNotifications(): void {
    // TODO: Implement notifications
    console.log('Open notifications');
  }
}
