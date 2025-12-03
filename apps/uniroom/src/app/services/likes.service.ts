import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class LikesService {
  private readonly apiService: ApiService = inject(ApiService);

  getMyLikes(): Observable<string[]> {
    return this.apiService.get<any>('likes/me').pipe(
      map((resp: any) => {
        if (!resp) {
          return [];
        }
        if (Array.isArray(resp)) {
          if (resp.length > 0 && typeof resp[0] === 'string') {
            return resp as string[];
          }
          return resp.map((r: any) => r.target_id || r.id).filter(Boolean);
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getLikeStatus(targetId: string): Observable<{ liked: boolean }> {
    return this.apiService.get<any>(`likes/${targetId}/status`).pipe(
      map((resp: any) => {
        if (resp == null) {
          return { liked: false };
        }
        if (typeof resp === 'boolean') {
          return { liked: resp };
        }
        if (typeof resp === 'object') {
          return { liked: !!resp.liked || !!resp.is_liked || !!resp.status };
        }
        return { liked: false };
      }),
      catchError(() => of({ liked: false }))
    );
  }

  like(targetId: string): Observable<any> {
    return this.apiService.post<any>(`likes/${targetId}`, {} as any);
  }

  unlike(targetId: string): Observable<any> {
    return this.apiService.delete<any>(`likes/${targetId}`);
  }
}
