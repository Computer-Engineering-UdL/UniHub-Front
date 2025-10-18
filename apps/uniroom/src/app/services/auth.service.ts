import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { User, Interest } from '../models/auth.types';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './api.service';
import { HttpHeaders } from '@angular/common/http';
import { OAuth2TokenResponse } from '../models/auth.types';
import { LocalizationService } from './localization.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private apiService: ApiService = inject(ApiService);
  private translate: TranslateService = inject(TranslateService);
  private localization: LocalizationService = inject(LocalizationService);

  private getStoredUser(): User | null {
    const userJson: string | null = localStorage.getItem(this.USER_KEY);
    return userJson ? (JSON.parse(userJson) as User) : null;
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

  private storeAuth(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private storeUserOnly(user: User): void {
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

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      // OAuth2 expects form data with username and password
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      formData.append('grant_type', 'password');

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      const tokenResponse: OAuth2TokenResponse = await firstValueFrom(
        this.apiService.post<OAuth2TokenResponse>('auth/login', formData.toString(), headers)
      );

      // Get user data with the access token and map fields
      const apiUser = await this.getCurrentUser(tokenResponse.access_token);
      const user: User = this.mapUserFromApi(apiUser);
      this.storeAuth(tokenResponse.access_token, tokenResponse.refresh_token, user);
    } catch (error) {
      throw error;
    }
  }

  private async getCurrentUser(token: string): Promise<User> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    // return raw api user (mapping applied by caller)
    return await firstValueFrom(this.apiService.get<any>('auth/me', undefined, headers));
  }

  async refreshToken(): Promise<void> {
    const refreshToken: string | null = this.getRefreshToken();
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
        this.apiService.post<OAuth2TokenResponse>('auth/refresh', formData.toString(), headers)
      );

      const apiUser = await this.getCurrentUser(tokenResponse.access_token);
      const user: User = this.mapUserFromApi(apiUser);
      this.storeAuth(tokenResponse.access_token, tokenResponse.refresh_token, user);
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  async signup(data: any): Promise<void> {
    try {
      // First create the account
      await firstValueFrom(this.apiService.post('auth/signup', data));

      // Then login with the credentials
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
              this.apiService.post<OAuth2TokenResponse>(`auth/${provider}/callback`, { token })
            );
            // Get user data with the access token
            const apiUser = await this.getCurrentUser(response.access_token);
            const user: User = this.mapUserFromApi(apiUser);
            this.storeAuth(response.access_token, response.refresh_token, user);
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
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  async reloadCurrentUserFromServer(): Promise<User> {
    const headers = this.buildAuthHeaders();
    const apiUser = await firstValueFrom(this.apiService.get<any>('auth/me', undefined, headers));
    const user = this.mapUserFromApi(apiUser);
    this.storeUserOnly(user);
    return user;
  }

  async fetchUserById(userId: string): Promise<User> {
    const headers = this.buildAuthHeaders();
    const apiUser = await firstValueFrom(this.apiService.get<any>(`user/${userId}`, undefined, headers));
    return this.mapUserFromApi(apiUser);
  }

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No current user');
    }
    const headers = this.buildAuthHeaders();
    const payload = this.prepareUserPayloadForApi(data);
    const apiUser = await firstValueFrom(this.apiService.patch<any>(`user/${this.currentUser.id}`, payload, headers));
    const updated = this.mapUserFromApi(apiUser);
    this.storeUserOnly(updated);
    return updated;
  }

  async getUserInterests(userId: string): Promise<Interest[]> {
    const headers = this.buildAuthHeaders();
    return await firstValueFrom(this.apiService.get<Interest[]>(`interest/user/${userId}`, undefined, headers));
  }

  async getAllInterests(): Promise<Interest[]> {
    const headers = this.buildAuthHeaders();
    return await firstValueFrom(this.apiService.get<Interest[]>(`interest`, undefined, headers));
  }

  async addInterestToUser(userId: string, interestId: string): Promise<void> {
    const headers = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.post(`interest/user/${userId}`, { interest_id: interestId }, headers));
    // refresh stored user interests
    if (this.currentUser && this.currentUser.id === userId) {
      const interests = await this.getUserInterests(userId);
      const updated = { ...this.currentUser, interests } as User;
      this.storeUserOnly(updated);
    }
  }

  async removeInterestFromUser(userId: string, interestId: string): Promise<void> {
    const headers = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.delete(`interest/user/${userId}/${interestId}`, undefined, headers));
    if (this.currentUser && this.currentUser.id === userId) {
      const interests = await this.getUserInterests(userId);
      const updated = { ...this.currentUser, interests } as User;
      this.storeUserOnly(updated);
    }
  }
}
