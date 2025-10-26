import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  public readonly API_URL = environment.apiUrl;

  get<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Observable<T> {
    const httpParams = this.buildHttpParams(params);
    const finalHeaders = this.buildHeaders(headers, requiresAuth);
    return this.http.get<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers: finalHeaders });
  }

  post<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    const finalHeaders = this.buildHeaders(headers, requiresAuth);
    return this.http.post<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders });
  }

  put<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    const finalHeaders = this.buildHeaders(headers, requiresAuth);
    return this.http.put<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders });
  }

  patch<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    const finalHeaders = this.buildHeaders(headers, requiresAuth);
    return this.http.patch<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders });
  }

  delete<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Observable<T> {
    const httpParams = this.buildHttpParams(params);
    const finalHeaders = this.buildHeaders(headers, requiresAuth);
    return this.http.delete<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers: finalHeaders });
  }

  private buildHeaders(customHeaders?: HttpHeaders, requiresAuth: boolean = true): HttpHeaders {
    let headers: HttpHeaders = customHeaders || new HttpHeaders();

    if (requiresAuth) {
      const token: string | null = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  private buildHttpParams(params?: Record<string, any>): HttpParams {
    let httpParams: HttpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== null && value !== undefined) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return httpParams;
  }
}
