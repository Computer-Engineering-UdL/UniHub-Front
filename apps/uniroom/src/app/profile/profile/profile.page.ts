import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  currentTheme: Theme = 'system';
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
    this.currentTheme = this.themeService.getTheme();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
