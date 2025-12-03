import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Theme, ThemeService } from '../../services/theme.service';
import { LangCode, LocalizationService } from '../../services/localization.service';
import { filter, map, mergeMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TopBarNotificationService, TopBarNotification } from '../../services/topbar-notification.service';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease-in', style({ opacity: 1 }))]),
      transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))])
    ])
  ]
})
export class TopBarComponent implements OnInit, OnDestroy {
  showTopBar: boolean = true;
  pageTitle: string = '';
  currentTheme: Theme = 'system';
  currentLanguage: LangCode = 'en';
  currentLangIcon: string = '';
  notificationCount: number = 0;
  notifications: TopBarNotification[] = [];
  showNotificationPanel: boolean = false;

  private readonly router: Router = inject(Router);
  private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly topBarNotificationService: TopBarNotificationService = inject(TopBarNotificationService);
  private routerSub?: Subscription;
  private languageSub?: Subscription;
  private notificationSub?: Subscription;
  private unreadCountSub?: Subscription;

  ngOnInit(): void {
    this.currentTheme = this.themeService.getTheme();
    this.currentLanguage = this.localizationService.getCurrentLanguage();

    this.languageSub = this.localizationService.language$.subscribe((lang: LangCode): void => {
      this.currentLanguage = lang;
      this.updateCurrentLangIcon();
    });

    this.routerSub = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        mergeMap((route) => route.data)
      )
      .subscribe((data) => {
        this.showTopBar = data['topBar'] !== false;
        this.pageTitle = data['titleKey'] || '';
      });

    this.notificationSub = this.topBarNotificationService.notifications$.subscribe(
      (notifications: TopBarNotification[]): void => {
        this.notifications = notifications;
      }
    );

    this.unreadCountSub = this.topBarNotificationService.unreadCount$.subscribe((count: number): void => {
      this.notificationCount = count;
    });

    this.updateCurrentLangIcon();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.languageSub?.unsubscribe();
    this.notificationSub?.unsubscribe();
    this.unreadCountSub?.unsubscribe();
  }

  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
  }

  async changeLanguage(lang: LangCode): Promise<void> {
    await this.localizationService.changeLanguage(lang);
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

  toggleNotificationPanel(): void {
    this.showNotificationPanel = !this.showNotificationPanel;
  }

  closeNotificationPanel(): void {
    this.showNotificationPanel = false;
  }

  async onNotificationClick(notification: TopBarNotification): Promise<void> {
    await this.topBarNotificationService.navigateToNotification(notification);
    this.closeNotificationPanel();
  }

  markAllAsRead(): void {
    this.topBarNotificationService.markAllAsRead();
  }

  clearReadNotifications(): void {
    this.topBarNotificationService.clearReadNotifications();
  }

  getNotificationIcon(icon: string): string {
    return icon;
  }

  getTimeAgo(timestamp: Date): string {
    return this.localizationService.formatRelativeTime(timestamp);
  }
}
