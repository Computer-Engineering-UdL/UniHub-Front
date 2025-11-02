import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { User, Interest, InterestCategory } from '../models/auth.types';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './api.service';
import { HttpHeaders } from '@angular/common/http';
import { OAuth2TokenResponse } from '../models/auth.types';
import { LocalizationService } from './localization.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private apiService: ApiService = inject(ApiService);
  private translate: TranslateService = inject(TranslateService);
  private localization: LocalizationService = inject(LocalizationService);
  private storage: StorageService = inject(StorageService);

  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadStoredUser();
    return this.initializationPromise;
  }

  private async loadStoredUser(): Promise<void> {
    try {
      const [token, refreshToken, user] = await Promise.all([
        this.storage.get(this.AUTH_TOKEN_KEY),
        this.storage.get(this.REFRESH_TOKEN_KEY),
        this.storage.getObject<User>(this.USER_KEY)
      ]);

      if (token && refreshToken && user) {
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  // map API user (snake_case) to app User (camelCase)
  private mapUserFromApi(apiUser: any): User {
    if (!apiUser) {
      return apiUser;
    }
    const createdRaw = apiUser.created_at || apiUser.joinedDate;
    const joinedDate: string | undefined = createdRaw ? this.localization.formatDate(createdRaw) : undefined;
    return {
      id: apiUser.id,
      username: apiUser.username,
      email: apiUser.email,
      name: apiUser.name || apiUser.username,
      firstName: apiUser.first_name || apiUser.firstName,
      lastName: apiUser.last_name || apiUser.lastName,
      fullName: apiUser.first_name?.trim() || apiUser.firstName?.trim() || '',
      phone: apiUser.phone,
      university: apiUser.university,
      provider: apiUser.provider,
      role: apiUser.role,
      imgUrl: apiUser.avatar_url || apiUser.imgUrl,
      joinedDate,
      yearOfStudy: apiUser.year_of_study || apiUser.yearOfStudy,
      isVerified: apiUser.is_verified ?? apiUser.isVerified,
      interests: apiUser.interests?.map((i: any) => ({ id: i.id, name: i.name })) || apiUser.interests
    } as User;
  }

  // prepare payload to send to API (camelCase -> snake_case)
  private prepareUserPayloadForApi(data: Partial<User>): any {
    const payload: any = {};
    if (data.firstName !== undefined) payload.first_name = data.firstName;
    if (data.lastName !== undefined) payload.last_name = data.lastName;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.university !== undefined) payload.university = data.university;
    if (data.imgUrl !== undefined) payload.avatar_url = data.imgUrl;
    if (data.yearOfStudy !== undefined) payload.year_of_study = data.yearOfStudy;
    // do not include interests here (as they have separate endpoints)
    return payload;
  }

  private async storeAuth(accessToken: string, refreshToken: string, user: User): Promise<void> {
    await Promise.all([
      this.storage.set(this.AUTH_TOKEN_KEY, accessToken),
      this.storage.set(this.REFRESH_TOKEN_KEY, refreshToken),
      this.storage.setObject(this.USER_KEY, user)
    ]);
    this.currentUserSubject.next(user);
  }

  private async storeUserOnly(user: User): Promise<void> {
    await this.storage.setObject(this.USER_KEY, user);
    this.currentUserSubject.next(user);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    const token: string | null = await this.storage.get(this.AUTH_TOKEN_KEY);
    return !!token;
  }

  async getToken(): Promise<string | null> {
    return await this.storage.get(this.AUTH_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.storage.get(this.REFRESH_TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      formData.append('grant_type', 'password');

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      const tokenResponse: OAuth2TokenResponse = await firstValueFrom(
        this.apiService.post<OAuth2TokenResponse>('auth/login', formData.toString(), headers, false)
      );

      const apiUser = await this.getCurrentUser(tokenResponse.access_token);
      const user: User = this.mapUserFromApi(apiUser);
      await this.storeAuth(tokenResponse.access_token, tokenResponse.refresh_token, user);
    } catch (error) {
      throw error;
    }
  }

  private async getCurrentUser(token: string): Promise<User> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return await firstValueFrom(this.apiService.get<any>('auth/me', undefined, headers, false));
  }

  async refreshToken(): Promise<void> {
    const refreshToken: string | null = await this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('refresh_token', refreshToken);

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      const tokenResponse: OAuth2TokenResponse = await firstValueFrom(
        this.apiService.post<OAuth2TokenResponse>('auth/refresh', formData.toString(), headers, false)
      );

      const apiUser = await this.getCurrentUser(tokenResponse.access_token);
      const user: User = this.mapUserFromApi(apiUser);
      await this.storeAuth(tokenResponse.access_token, tokenResponse.refresh_token, user);
    } catch (error) {
      await this.logout();
      throw error;
    }
  }

  async signup(data: any): Promise<void> {
    try {
      await firstValueFrom(this.apiService.post('auth/signup', data, undefined, false));

      await this.login(data.email, data.password);
    } catch (error) {
      throw error;
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
            const response: OAuth2TokenResponse = await firstValueFrom(
              this.apiService.post<OAuth2TokenResponse>(`auth/${provider}/callback`, { token }, undefined, false)
            );
            const apiUser = await this.getCurrentUser(response.access_token);
            const user: User = this.mapUserFromApi(apiUser);
            await this.storeAuth(response.access_token, response.refresh_token, user);
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

  async logout(): Promise<void> {
    await Promise.all([
      this.storage.remove(this.AUTH_TOKEN_KEY),
      this.storage.remove(this.REFRESH_TOKEN_KEY),
      this.storage.remove(this.USER_KEY)
    ]);
    this.currentUserSubject.next(null);
  }

  async reloadCurrentUserFromServer(): Promise<User> {
    const apiUser = await firstValueFrom(this.apiService.get<any>('auth/me'));
    const user = this.mapUserFromApi(apiUser);
    await this.storeUserOnly(user);
    return user;
  }

  async fetchUserById(userId: string): Promise<User> {
    const apiUser = await firstValueFrom(this.apiService.get<any>(`user/${userId}`));
    return this.mapUserFromApi(apiUser);
  }

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No current user');
    }
    const payload = this.prepareUserPayloadForApi(data);
    const apiUser = await firstValueFrom(this.apiService.patch<any>(`user/${this.currentUser.id}`, payload));
    const updated = this.mapUserFromApi(apiUser);
    await this.storeUserOnly(updated);
    return updated;
  }

  async getUserInterests(userId: string): Promise<Interest[]> {
    try {
      return await firstValueFrom(this.apiService.get<Interest[]>(`interest/user/${userId}`));
    } catch (_) {
      return [];
    }
  }

  async getAllInterests(): Promise<Interest[]> {
    try {
      const categories: InterestCategory[] = await firstValueFrom(this.apiService.get<InterestCategory[]>(`interest/`));
      return categories.reduce((acc: Interest[], category: InterestCategory): Interest[] => {
        return [...acc, ...category.interests];
      }, []);
    } catch (_) {
      return [];
    }
  }

  async addInterestToUser(userId: string, interestId: string): Promise<void> {
    await firstValueFrom(this.apiService.post(`interest/user/${userId}`, { interest_id: interestId }));
    if (this.currentUser && this.currentUser.id === userId) {
      const interests: Interest[] = await this.getUserInterests(userId);
      const updated = { ...this.currentUser, interests } as User;
      await this.storeUserOnly(updated);
    }
  }

  async removeInterestFromUser(userId: string, interestId: string): Promise<void> {
    await firstValueFrom(this.apiService.delete(`interest/user/${userId}/${interestId}`));
    if (this.currentUser && this.currentUser.id === userId) {
      const interests: Interest[] = await this.getUserInterests(userId);
      const updated = { ...this.currentUser, interests } as User;
      await this.storeUserOnly(updated);
    }
  }
}
