import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { AuthResponse, LoginCredentials, SignupData, User } from '../models/auth.types';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private apiService = inject(ApiService);
  private translate: TranslateService = inject(TranslateService);

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

  async login(emailOrCredentials: string | LoginCredentials, passwordMaybe?: string): Promise<void> {
    const { email, password }: LoginCredentials =
      typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials, password: passwordMaybe ?? '' }
        : emailOrCredentials;

    try {
      const response: AuthResponse = await firstValueFrom(
        this.apiService.post<AuthResponse>(`auth/login`, {
          email,
          password
        })
      );
      this.storeAuth(response.token, response.user);
    } catch (error) {
      throw error;
    }
  }

  async signup(data: SignupData): Promise<void> {
    try {
      const response: AuthResponse = await firstValueFrom(this.apiService.post<AuthResponse>(`auth/signup`, data));
      this.storeAuth(response.token, response.user);
    } catch {
      throw new Error('Signup failed');
    }
  }

  async loginWithGithub(): Promise<void> {
    return this.loginWithOAuthProvider('github');
  }

  async loginWithGoogle(): Promise<void> {
    return this.loginWithOAuthProvider('google');
  }

  private async loginWithOAuthProvider(provider: 'github' | 'google'): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
      const windowFeatures = 'width=500,height=600';
      const oauthWindow: Window | null = window.open(
        `${this.apiService.API_URL}/auth/${provider}`,
        '_blank',
        windowFeatures
      );
      if (!oauthWindow) {
        reject(new Error('Failed to open OAuth window'));
        return;
      }
      let closedCheck: number | undefined;
      const messageListener = async (event: MessageEvent): Promise<void> => {
        if (event.data && event.data.type === 'oauth-success' && event.data.provider === provider) {
          window.removeEventListener('message', messageListener);
          if (closedCheck) {
            clearInterval(closedCheck);
          }
          oauthWindow.close();
          try {
            const { token } = event.data;
            const response: AuthResponse = await firstValueFrom(
              this.apiService.post<AuthResponse>(`auth/${provider}/callback`, { token })
            );
            this.storeAuth(response.token, response.user);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      };
      window.addEventListener('message', messageListener);
      closedCheck = window.setInterval(() => {
        if (oauthWindow.closed) {
          window.removeEventListener('message', messageListener);
          clearInterval(closedCheck);
          reject(new Error(this.translate.instant('LOGIN.ERROR.OAUTH_WINDOW_CLOSED')));
        }
      }, 500);
    });
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
}
