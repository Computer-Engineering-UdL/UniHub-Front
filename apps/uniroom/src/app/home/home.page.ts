import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.types';
import { Subscription } from 'rxjs';

interface Room {
  id: number;
  title: string;
  location: string;
  price: number;
  image: string;
  bedrooms: number;
  bathrooms: number;
  available: boolean;
  rating: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  user: User | null = null;
  rooms: Room[] = [];
  private authService = inject(AuthService);
  private userSub?: Subscription;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
    });
    this.loadMockRooms();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  private loadMockRooms(): void {
    this.rooms = [
      {
        id: 1,
        title: 'Cozy Studio Near Campus',
        location: 'Barcelona, Spain',
        price: 450,
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
        bedrooms: 1,
        bathrooms: 1,
        available: true,
        rating: 4.8
      },
      {
        id: 2,
        title: 'Modern Apartment Downtown',
        location: 'Madrid, Spain',
        price: 650,
        image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
        bedrooms: 2,
        bathrooms: 1,
        available: true,
        rating: 4.5
      },
      {
        id: 3,
        title: 'Shared Room University District',
        location: 'Valencia, Spain',
        price: 280,
        image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
        bedrooms: 1,
        bathrooms: 1,
        available: true,
        rating: 4.3
      },
      {
        id: 4,
        title: 'Luxury Penthouse with Terrace',
        location: 'Barcelona, Spain',
        price: 950,
        image: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
        bedrooms: 3,
        bathrooms: 2,
        available: false,
        rating: 4.9
      },
      {
        id: 5,
        title: 'Bright Room with Balcony',
        location: 'Sevilla, Spain',
        price: 380,
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        bedrooms: 1,
        bathrooms: 1,
        available: true,
        rating: 4.6
      },
      {
        id: 6,
        title: 'Student Residence Room',
        location: 'Granada, Spain',
        price: 320,
        image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
        bedrooms: 1,
        bathrooms: 1,
        available: true,
        rating: 4.4
      }
    ];
  }

  getRatingStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    if (hasHalfStar) {
      stars.push('star-half');
    }
    while (stars.length < 5) {
      stars.push('star-outline');
    }

    return stars;
  }
}
