import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.types';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../shared/api.service';

interface RoomAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  created_by: number;
  target_rooms: string[];
  is_active: boolean;
  created_at: string;
  expires_at: string;
  image?: string;
  bedrooms?: number;
  bathrooms?: number;
  price?: number;
  rating?: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  public user: User | null = null;
  public roomAnnouncements: RoomAnnouncement[] = [];
  private authService: AuthService = inject(AuthService);
  private apiService = inject(ApiService);
  private userSub?: Subscription;

  async ngOnInit(): Promise<void> {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
    });
    await this.loadRoomAnnouncements();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  private async loadRoomAnnouncements(): Promise<void> {
    this.roomAnnouncements = await firstValueFrom(this.apiService.get<RoomAnnouncement[]>('announcements'));
    this.fillMissingRoomImages();
  }

  private fillMissingRoomImages(): void {
    const placeholderImages = [
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ];
    this.roomAnnouncements.forEach((announcement, index) => {
      if (!announcement.image) {
        announcement.image = placeholderImages[index % placeholderImages.length];
      }
    });
  }
}
