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

  get<T>(endpoint: string, params?: Record<string, any>, headers?: HttpHeaders): Observable<T> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers });
  }

  post<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(`${this.API_URL}/${endpoint}`, body, { headers });
  }

  put<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders): Observable<T> {
    return this.http.put<T>(`${this.API_URL}/${endpoint}`, body, { headers });
  }

  patch<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders): Observable<T> {
    return this.http.patch<T>(`${this.API_URL}/${endpoint}`, body, { headers });
  }

  delete<T>(endpoint: string, params?: Record<string, any>, headers?: HttpHeaders): Observable<T> {
    const httpParams = this.buildHttpParams(params);
    return this.http.delete<T>(`${this.API_URL}/${endpoint}`, { params: httpParams, headers });
  }

  private buildHttpParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();

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
