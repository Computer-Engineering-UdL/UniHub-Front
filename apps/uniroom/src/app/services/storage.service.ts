import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async clear(): Promise<void> {
    await Preferences.clear();
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value: string | null = await this.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }
}
