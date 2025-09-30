import { Component, OnInit, inject } from '@angular/core';
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

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }
}
