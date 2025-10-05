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

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }
}
