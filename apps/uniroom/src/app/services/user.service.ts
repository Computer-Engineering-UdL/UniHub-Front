import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/auth.types';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);

  getUsers(): Observable<User[]> {
    return this.apiService
      .get<any[]>('user/')
      .pipe(map((users: any[]): User[] => users.map((user: any): User => this.authService.mapUserFromApi(user))));
  }

  searchUsers(query: string): Observable<User[]> {
    return this.apiService
      .get<any[]>(`user/search?q=${query}`)
      .pipe(map((users: any[]): User[] => users.map((user: any): User => this.authService.mapUserFromApi(user))));
  }
}
