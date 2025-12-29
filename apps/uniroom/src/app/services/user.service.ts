import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/auth.types';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly authService: AuthService = inject(AuthService);

  getUsers(): Observable<User[]> {
    return this.apiService
      .get<User[]>('user/')
      .pipe(map((users: User[]): User[] => users.map((user: User): User => this.authService.mapUserFromApi(user))));
  }

  searchUsers(query: string): Observable<User[]> {
    return this.apiService
      .get<User[]>(`user/search?q=${query}`)
      .pipe(map((users: User[]): User[] => users.map((user: User): User => this.authService.mapUserFromApi(user))));
  }
}
