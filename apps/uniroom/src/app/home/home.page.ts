import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  user: User | null = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
