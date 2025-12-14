import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ItemCategory, PagedResult, Item, UniItemsQuery } from '../models/uni-item.types';

@Injectable({
  providedIn: 'root'
})
export class UniItemsService {
  private readonly apiService: ApiService = inject(ApiService);

  getItems(query: UniItemsQuery): Observable<PagedResult<Item>> {
    const params: Record<string, any> = this.serializeQuery(query);
    return this.apiService.get<PagedResult<Item>>('items/', params, undefined, false);
  }

  getItemById(id: string): Observable<Item> {
    return this.apiService.get<Item>(`items/${id}`, undefined, undefined, false);
  }

  getCategories(): Observable<ItemCategory[]> {
    return this.apiService.get<ItemCategory[]>('item-categories/', undefined, undefined, false);
  }

  createItem(payload: Partial<Item>): Observable<Item> {
    return this.apiService.post<Item>('items', payload);
  }

  updateItem(id: string, payload: Partial<Item>): Observable<Item> {
    return this.apiService.put<Item>(`items/${id}`, payload);
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
