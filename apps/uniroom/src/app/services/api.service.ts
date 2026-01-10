import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { from, Observable, switchMap } from 'rxjs';
import { StorageService } from './storage.service';
import { CapacitorHttp, HttpResponse, Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  public readonly API_URL = environment.apiUrl;
  private readonly isNative = Capacitor.isNativePlatform();

  get<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Observable<T> {
    if (this.isNative) {
      return from(this.nativeGet<T>(endpoint, params, headers, requiresAuth));
    }
    const httpParams = this.buildHttpParams(params);
    return from(this.buildHeaders(headers, requiresAuth, false)).pipe(
      switchMap((finalHeaders: HttpHeaders) =>
        this.http.get<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers: finalHeaders })
      )
    );
  }

  post<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    if (this.isNative) {
      return from(this.nativePost<T, B>(endpoint, body, headers, requiresAuth));
    }
    const isFormData: boolean = body instanceof FormData;
    return from(this.buildHeaders(headers, requiresAuth, isFormData)).pipe(
      switchMap((finalHeaders: HttpHeaders) =>
        this.http.post<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders })
      )
    );
  }

  put<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    if (this.isNative) {
      return from(this.nativePut<T, B>(endpoint, body, headers, requiresAuth));
    }
    return from(this.buildHeaders(headers, requiresAuth, false)).pipe(
      switchMap((finalHeaders: HttpHeaders) =>
        this.http.put<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders })
      )
    );
  }

  patch<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders, requiresAuth: boolean = true): Observable<T> {
    if (this.isNative) {
      return from(this.nativePatch<T, B>(endpoint, body, headers, requiresAuth));
    }
    return from(this.buildHeaders(headers, requiresAuth, false)).pipe(
      switchMap((finalHeaders: HttpHeaders) =>
        this.http.patch<T>(`${this.API_URL}/${endpoint}`, body, { headers: finalHeaders })
      )
    );
  }

  delete<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Observable<T> {
    if (this.isNative) {
      return from(this.nativeDelete<T>(endpoint, params, headers, requiresAuth));
    }
    const httpParams = this.buildHttpParams(params);
    return from(this.buildHeaders(headers, requiresAuth, false)).pipe(
      switchMap((finalHeaders: HttpHeaders) =>
        this.http.delete<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers: finalHeaders })
      )
    );
  }

  private async nativeGet<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Promise<T> {
    const finalHeaders = await this.buildHeadersObject(headers, requiresAuth, false);
    const url = this.buildUrl(endpoint, params);

    const response: HttpResponse = await CapacitorHttp.get({
      url,
      headers: finalHeaders
    });

    return response.data;
  }

  private async nativePost<T, B = any>(
    endpoint: string,
    body: B,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Promise<T> {
    const isFormData: boolean = body instanceof FormData;
    const finalHeaders = await this.buildHeadersObject(headers, requiresAuth, isFormData);

    const response: HttpResponse = await CapacitorHttp.post({
      url: `${this.API_URL}/${endpoint}`,
      headers: finalHeaders,
      data: body
    });

    return response.data;
  }

  private async nativePut<T, B = any>(
    endpoint: string,
    body: B,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Promise<T> {
    const finalHeaders = await this.buildHeadersObject(headers, requiresAuth, false);

    const response: HttpResponse = await CapacitorHttp.put({
      url: `${this.API_URL}/${endpoint}`,
      headers: finalHeaders,
      data: body
    });

    return response.data;
  }

  private async nativePatch<T, B = any>(
    endpoint: string,
    body: B,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Promise<T> {
    const finalHeaders = await this.buildHeadersObject(headers, requiresAuth, false);

    const response: HttpResponse = await CapacitorHttp.patch({
      url: `${this.API_URL}/${endpoint}`,
      headers: finalHeaders,
      data: body
    });

    return response.data;
  }

  private async nativeDelete<T>(
    endpoint: string,
    params?: Record<string, any>,
    headers?: HttpHeaders,
    requiresAuth: boolean = true
  ): Promise<T> {
    const finalHeaders = await this.buildHeadersObject(headers, requiresAuth, false);
    const url = this.buildUrl(endpoint, params);

    const response: HttpResponse = await CapacitorHttp.delete({
      url,
      headers: finalHeaders
    });

    return response.data;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.API_URL}/${endpoint}`;

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        if (Array.isArray(value)) {
          value
            .filter((entry) => entry !== null && entry !== undefined)
            .forEach((entry) => {
              queryParams.append(key, String(entry));
            });
        } else {
          queryParams.set(key, String(value));
        }
      });

      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private async buildHeadersObject(
    customHeaders?: HttpHeaders,
    requiresAuth: boolean = true,
    skipContentType: boolean = false
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (!skipContentType) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    }

    if (customHeaders) {
      customHeaders.keys().forEach((key) => {
        const value = customHeaders.get(key);
        if (value) {
          headers[key] = value;
        }
      });
    }

    if (requiresAuth) {
      const token: string | null = await this.storage.get('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async buildHeaders(
    customHeaders?: HttpHeaders,
    requiresAuth: boolean = true,
    skipContentType: boolean = false
  ): Promise<HttpHeaders> {
    let headers: HttpHeaders = customHeaders || new HttpHeaders();

    if (!skipContentType && !headers.has('Content-Type')) {
      headers = headers.set('Content-Type', 'application/json');
    }

    if (requiresAuth) {
      const token: string | null = await this.storage.get('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  private buildHttpParams(params?: Record<string, any>): HttpParams {
    let httpParams: HttpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }

        if (Array.isArray(value)) {
          value
            .filter((entry) => entry !== null && entry !== undefined)
            .forEach((entry) => {
              httpParams = httpParams.append(key, String(entry));
            });
          return;
        }

        httpParams = httpParams.set(key, String(value));
      });
    }

    return httpParams;
  }
}
