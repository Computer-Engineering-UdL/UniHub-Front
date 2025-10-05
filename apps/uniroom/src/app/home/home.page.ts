import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.types';
import { Subscription } from 'rxjs';
import { LangCode, LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  user: User | null = null;
  private authService: AuthService = inject(AuthService);
  private localizationService: LocalizationService = inject(LocalizationService);

  private userSub?: Subscription;

  ngOnInit(): void {
    const currentLang: LangCode = this.localizationService.getCurrentLanguage();
    this.localizationService.changeLanguage(currentLang);

    this.userSub = this.authService.currentUser$.subscribe((user: User | null): void => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }
}
