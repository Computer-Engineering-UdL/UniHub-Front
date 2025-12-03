export interface UniItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'used' | 'for_parts';
  price: number;
  currency: string;
  location: string;
  images: string[];
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface UniItemsQuery {
  search?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
