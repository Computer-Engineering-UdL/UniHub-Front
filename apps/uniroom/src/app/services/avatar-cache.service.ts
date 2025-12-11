import { Injectable } from '@angular/core';

interface CachedAvatar {
  url: string;
  blob: Blob;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AvatarCacheService {
  private readonly DB_NAME = 'uniroom-avatars';
  private readonly STORE_NAME = 'avatars';
  private readonly DB_VERSION = 1;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
  private db: IDBDatabase | null = null;
  private readonly pendingRequests = new Map<string, Promise<string | null>>();

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
        }
      };
    });
  }

  async getAvatar(url: string): Promise<string | null> {
    if (!url) return null;

    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url)!;
    }

    const request = this.loadAvatar(url);
    this.pendingRequests.set(url, request);

    try {
      return await request;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  private async loadAvatar(url: string): Promise<string | null> {
    await this.init();

    const cached = await this.getCachedAvatar(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return URL.createObjectURL(cached.blob);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) return url;

      const blob = await response.blob();
      await this.setCachedAvatar(url, blob);
      return URL.createObjectURL(blob);
    } catch {
      return url;
    }
  }

  private async getCachedAvatar(url: string): Promise<CachedAvatar | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(url);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async setCachedAvatar(url: string, blob: Blob): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const data: CachedAvatar = {
        url,
        blob,
        timestamp: Date.now()
      };
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const data = cursor.value as CachedAvatar;
          if (Date.now() - data.timestamp >= this.CACHE_DURATION) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async clearCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
