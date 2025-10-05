import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.scss'],
  standalone: false
})
export class UnauthorizedPage {
  private router: Router = inject(Router);

  async goHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  async goLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }
}
