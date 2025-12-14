import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from './api.service';
import {
  ItemCategory,
  ItemCreateRequest,
  ItemRead,
  ItemUpdateRequest,
  ItemsListParams,
  ItemsListResponse
} from '../models/uni-item.types';

@Injectable({
  providedIn: 'root'
})
export class UniItemsService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly itemsChangedSubject: Subject<void> = new Subject<void>();

  readonly itemsChanged$: Observable<void> = this.itemsChangedSubject.asObservable();

  listItems(query: ItemsListParams): Observable<ItemsListResponse> {
    const params: Record<string, any> = this.serializeQuery(query);
    return this.apiService.get<ItemsListResponse>('items/', params, undefined, false);
  }

  getItemDetail(id: string): Observable<ItemRead> {
    return this.apiService.get<ItemRead>(`items/${id}`, undefined, undefined, false);
  }

  getCategories(): Observable<ItemCategory[]> {
    return this.apiService.get<ItemCategory[]>('item-categories/', undefined, undefined, false);
  }

  createItem(payload: ItemCreateRequest): Observable<ItemRead> {
    return new Observable<ItemRead>((observer) => {
      this.apiService.post<ItemRead>('items/', payload).subscribe({
        next: (result: ItemRead) => {
          this.itemsChangedSubject.next();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  updateItem(id: string, payload: ItemUpdateRequest): Observable<ItemRead> {
    return new Observable<ItemRead>((observer) => {
      this.apiService.patch<ItemRead>(`items/${id}`, payload).subscribe({
        next: (result: ItemRead) => {
          this.itemsChangedSubject.next();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  deleteItem(id: string): Observable<void> {
    return new Observable<void>((observer) => {
      this.apiService.delete<void>(`items/${id}`).subscribe({
        next: () => {
          this.itemsChangedSubject.next();
          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  private serializeQuery(query: ItemsListParams): Record<string, string | number | string[]> {
    const params: Record<string, string | number | string[]> = {};

    if (query.search) {
      params['search'] = query.search;
    }
    if (query.category_ids?.length) {
      params['category_ids'] = query.category_ids;
    }
    if (query.conditions?.length) {
      params['conditions'] = query.conditions;
    }
    if (query.min_price !== undefined) {
      params['min_price'] = query.min_price;
    }
    if (query.max_price !== undefined) {
      params['max_price'] = query.max_price;
    }
    if (query.location) {
      params['location'] = query.location;
    }
    if (query.sort) {
      params['sort'] = query.sort;
    }
    if (query.page !== undefined) {
      params['page'] = query.page;
    }
    if (query.page_size !== undefined) {
      params['page_size'] = query.page_size;
    }
    return params;
  }
}
