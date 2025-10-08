import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { User } from '../../models/auth.types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {
  user: User | null = null;
  currentTheme: Theme = 'system';
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private userSub?: Subscription;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
    });
    this.currentTheme = this.themeService.getTheme();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  async toggleTheme(): Promise<void> {
    await this.themeService.toggleTheme();
    this.currentTheme = this.themeService.getTheme();
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

  getThemeLabel(): string {
    return `PROFILE.THEME.${this.currentTheme.toUpperCase()}`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
