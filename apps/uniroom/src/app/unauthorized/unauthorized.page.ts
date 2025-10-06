import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from "rxjs";
import { User } from "../models/auth.types";

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.scss'],
  standalone: false
})
export class UnauthorizedPage {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  public currentUser$: Observable<User | null> = this.authService.currentUser$;

  async goHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  async goLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }
}
