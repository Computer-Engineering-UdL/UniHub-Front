import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/auth.types';

@Injectable({ providedIn: 'root' })
export class JobAvatarService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly cache: Map<string, string | null> = new Map<string, string | null>();
  private readonly pending: Map<string, Promise<string | null>> = new Map<string, Promise<string | null>>();

  async getAvatarForUser(userId: string | undefined): Promise<string | null> {
    if (!userId) {
      return null;
    }

    if (this.cache.has(userId)) {
      return this.cache.get(userId) ?? null;
    }

    if (this.pending.has(userId)) {
      return this.pending.get(userId)!;
    }

    const request: Promise<string | null> = this.fetchAvatar(userId);
    this.pending.set(userId, request);

    try {
      return await request;
    } finally {
      this.pending.delete(userId);
    }
  }

  private async fetchAvatar(userId: string): Promise<string | null> {
    try {
      const user: User = await firstValueFrom(this.apiService.get<User>(`user/public/${userId}`));
      const avatarUrl: string | undefined = user.avatar_url || user.imgUrl;
      this.cache.set(userId, avatarUrl ?? null);
      return avatarUrl ?? null;
    } catch {
      this.cache.set(userId, null);
      return null;
    }
  }
}
