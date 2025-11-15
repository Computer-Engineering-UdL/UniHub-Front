import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/auth.types';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiService: ApiService = inject(ApiService);

  searchUsers(query: string): Observable<User[]> {
    return this.apiService.get<User[]>(`user/search?q=${query}`);
  }
}
