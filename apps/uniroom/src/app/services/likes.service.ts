import { Injectable, inject } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';

interface LikeItem {
  target_id?: string;
  id?: string;
}

interface LikeStatusResponse {
  liked?: boolean;
  is_liked?: boolean;
  status?: boolean;
}

interface LikeChangeEvent {
  targetId: string;
  liked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LikesService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly likeChangeSubject: Subject<LikeChangeEvent> = new Subject<LikeChangeEvent>();
  public readonly likeChange$: Observable<LikeChangeEvent> = this.likeChangeSubject.asObservable();

  getMyLikes(): Observable<string[]> {
    return this.apiService.get<string[] | LikeItem[]>('likes/me').pipe(
      map((resp: string[] | LikeItem[] | null) => {
        if (!resp) {
          return [];
        }
        if (Array.isArray(resp)) {
          if (resp.length > 0 && typeof resp[0] === 'string') {
            return resp as string[];
          }
          return (resp as LikeItem[]).map((r: LikeItem) => r.target_id || r.id).filter(Boolean) as string[];
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getLikeStatus(targetId: string): Observable<{ liked: boolean }> {
    return this.apiService.get<boolean | LikeStatusResponse>(`likes/${targetId}/status`).pipe(
      map((resp: boolean | LikeStatusResponse | null) => {
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

  like(targetId: string): Observable<unknown> {
    return this.apiService.post<unknown>(`likes/${targetId}`, {}).pipe(
      tap(() => {
        this.likeChangeSubject.next({ targetId, liked: true });
      })
    );
  }

  unlike(targetId: string): Observable<unknown> {
    return this.apiService.delete<unknown>(`likes/${targetId}`).pipe(
      tap(() => {
        this.likeChangeSubject.next({ targetId, liked: false });
      })
    );
  }
}
