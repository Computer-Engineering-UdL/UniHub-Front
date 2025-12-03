import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PagedResult, UniItem, UniItemsQuery } from '../models/uni-item.types';

@Injectable({
  providedIn: 'root'
})
export class UniItemsService {
  private readonly apiService: ApiService = inject(ApiService);

  getItems(query: UniItemsQuery): Observable<PagedResult<UniItem>> {
    const params: Record<string, any> = this.serializeQuery(query);
    return this.apiService.get<PagedResult<UniItem>>('items', params, undefined, false);
  }

  getItemById(id: string): Observable<UniItem> {
    return this.apiService.get<UniItem>(`items/${id}`, undefined, undefined, false);
  }

  createItem(payload: Partial<UniItem>): Observable<UniItem> {
    return this.apiService.post<UniItem>('items', payload);
  }

  updateItem(id: string, payload: Partial<UniItem>): Observable<UniItem> {
    return this.apiService.put<UniItem>(`items/${id}`, payload);
  }

  deleteItem(id: string): Observable<void> {
    return this.apiService.delete<void>(`items/${id}`);
  }

  private serializeQuery(query: UniItemsQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};

    if (query.search) {
      params['search'] = query.search;
    }
    if (query.categories?.length) {
      params['categories'] = query.categories.join(',');
    }
    if (query.minPrice !== undefined) {
      params['min_price'] = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      params['max_price'] = query.maxPrice;
    }
    if (query.condition) {
      params['condition'] = query.condition;
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
    if (query.pageSize !== undefined) {
      params['page_size'] = query.pageSize;
    }
    return params;
  }
}
