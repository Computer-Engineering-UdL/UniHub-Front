import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  user: User | null = null;
  private authService = inject(AuthService);
  private userSub?: Subscription;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }
}
