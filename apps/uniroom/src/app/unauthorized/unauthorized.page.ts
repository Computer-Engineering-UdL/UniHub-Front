import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LangCode, LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.scss'],
  standalone: false
})
export class UnauthorizedPage implements OnInit {
  private localizationService: LocalizationService = inject(LocalizationService);
  private router: Router = inject(Router);

  ngOnInit(): void {
    const currentLang: LangCode = this.localizationService.getCurrentLanguage();
    this.localizationService.changeLanguage(currentLang);
  }

  async goHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  async goLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }
}
