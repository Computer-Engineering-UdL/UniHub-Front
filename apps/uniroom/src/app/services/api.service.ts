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

  get<T>(endpoint: string, params?: HttpParams, headers?: HttpHeaders): Observable<T> {
    return this.http.get<T>(`${this.API_URL}/${endpoint}`, { params, headers });
  }

  post<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(`${this.API_URL}/${endpoint}`, body, { headers });
  }

  put<T, B = any>(endpoint: string, body: B, headers?: HttpHeaders): Observable<T> {
    return this.http.put<T>(`${this.API_URL}/${endpoint}`, body, { headers });
  }

  delete<T>(endpoint: string, params?: HttpParams, headers?: HttpHeaders): Observable<T> {
    return this.http.delete<T>(`${this.API_URL}/${endpoint}`, { params, headers });
  }
}
