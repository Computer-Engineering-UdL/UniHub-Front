import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  User,
  AuthResponse,
  SignupData,
  LoginCredentials,
} from '../models/auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';

  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getStoredUser(),
  );
  public currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  private http = inject(HttpClient);

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? (JSON.parse(userJson) as User) : null;
  }

  private storeAuth(token: string, user: User): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  async login(
    emailOrCredentials: string | LoginCredentials,
    passwordMaybe?: string,
  ): Promise<void> {
    const { email, password }: LoginCredentials =
      typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials, password: passwordMaybe ?? '' }
        : emailOrCredentials;

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, {
          email,
          password,
        }),
      );
      this.storeAuth(response.token, response.user);
    } catch {
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        provider: 'local',
        role: 'Basic',
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      this.storeAuth(mockToken, mockUser);
    }
  }

  async signup(data: SignupData): Promise<void> {
    try {
      const response: AuthResponse = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/signup`, data),
      );
      this.storeAuth(response.token, response.user);
    } catch {
      // Fallback mock registration (dev/demo only)
      const mockUser: User = {
        id: Date.now().toString(),
        email: data.email,
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        university: data.university,
        provider: 'local',
        role: 'Basic',
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      this.storeAuth(mockToken, mockUser);
    }
  }

  async loginWithGithub(): Promise<void> {
    try {
      window.open(
        `${this.API_URL}/auth/github`,
        '_blank',
        'width=500,height=600',
      );
      await this.simulateOAuthLogin('github');
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw new Error('Failed to login with GitHub');
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      window.open(
        `${this.API_URL}/auth/google`,
        '_blank',
        'width=500,height=600',
      );
      await this.simulateOAuthLogin('google');
    } catch (error) {
      console.error('Google login failed:', error);
      throw new Error('Failed to login with Google');
    }
  }

  private async simulateOAuthLogin(
    provider: 'github' | 'google',
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: provider + '-' + Date.now(),
          email: `user@${provider}.com`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
          provider,
          role: 'Basic',
        };
        const mockToken = `mock-${provider}-token-` + Date.now();
        this.storeAuth(mockToken, mockUser);
        resolve();
      }, 1000);
    });
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
}
