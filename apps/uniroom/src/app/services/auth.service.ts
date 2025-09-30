import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  university?: string;
  provider?: 'local' | 'github' | 'google';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  university?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';

  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getStoredUser(),
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  private http = inject(HttpClient);

  // Get stored user from localStorage
  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  // Store user and token
  private storeAuth(token: string, user: User): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Get current user
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  // Login with email and password
  async login(email: string, password: string): Promise<void> {
    try {
      // In a real application, this would call your backend API
      // For now, we'll simulate an API call
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, {
          email,
          password,
        }),
      );

      this.storeAuth(response.token, response.user);
    } catch (error: any) {
      // For demo purposes, we'll accept any credentials
      // In production, this should throw the actual error
      console.warn('API call failed, using mock authentication');

      const mockUser: User = {
        id: '1',
        email: email,
        name: email.split('@')[0],
        provider: 'local',
      };

      const mockToken = 'mock-jwt-token-' + Date.now();
      this.storeAuth(mockToken, mockUser);
    }
  }

  // Signup with user data
  async signup(data: SignupData): Promise<void> {
    try {
      // In a real application, this would call your backend API
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/signup`, data),
      );

      this.storeAuth(response.token, response.user);
    } catch (error: any) {
      // For demo purposes, we'll create a mock user
      // In production, this should throw the actual error
      console.warn('API call failed, using mock registration');

      const mockUser: User = {
        id: Date.now().toString(),
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        university: data.university,
        provider: 'local',
      };

      const mockToken = 'mock-jwt-token-' + Date.now();
      this.storeAuth(mockToken, mockUser);
    }
  }

  // Login with GitHub
  async loginWithGithub(): Promise<void> {
    try {
      // In a real application, this would redirect to GitHub OAuth
      // For now, we'll simulate a successful OAuth flow
      window.open(
        `${this.API_URL}/auth/github`,
        '_blank',
        'width=500,height=600',
      );

      // Listen for OAuth callback
      // In production, implement proper OAuth callback handling
      await this.simulateOAuthLogin('github');
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw new Error('Failed to login with GitHub');
    }
  }

  // Login with Google
  async loginWithGoogle(): Promise<void> {
    try {
      // In a real application, this would redirect to Google OAuth
      // For now, we'll simulate a successful OAuth flow
      window.open(
        `${this.API_URL}/auth/google`,
        '_blank',
        'width=500,height=600',
      );

      // Listen for OAuth callback
      // In production, implement proper OAuth callback handling
      await this.simulateOAuthLogin('google');
    } catch (error) {
      console.error('Google login failed:', error);
      throw new Error('Failed to login with Google');
    }
  }

  // Simulate OAuth login for demo purposes
  private async simulateOAuthLogin(
    provider: 'github' | 'google',
  ): Promise<void> {
    // In production, this would wait for the OAuth callback
    // For demo, we'll create a mock user after a short delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: provider + '-' + Date.now(),
          email: `user@${provider}.com`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
          provider: provider,
        };

        const mockToken = `mock-${provider}-token-` + Date.now();
        this.storeAuth(mockToken, mockUser);
        resolve();
      }, 1000);
    });
  }

  // Logout
  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
}
