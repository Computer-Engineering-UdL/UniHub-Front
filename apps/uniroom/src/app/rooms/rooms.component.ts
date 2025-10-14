import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';

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
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss'],
  standalone: false
})
export class RoomsComponent implements OnInit {
  public roomAnnouncements: RoomAnnouncement[] = [];
  private apiService: ApiService = inject(ApiService);

  async ngOnInit(): Promise<void> {
    await this.loadRoomAnnouncements();
  }

  private async loadRoomAnnouncements(): Promise<void> {
    this.roomAnnouncements = await firstValueFrom(this.apiService.get<RoomAnnouncement[]>('announcements'));
    this.fillMissingRoomImages();
  }

  private fillMissingRoomImages(): void {
    const placeholderImages: string[] = [
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
