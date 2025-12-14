export type ItemCondition = 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';

export type ItemSort = 'newest' | 'price_asc' | 'price_desc';

export type ItemStatus = 'active' | 'inactive' | 'sold' | 'pending' | 'archived';

export interface ItemCategory {
  id: string;
  name: string;
}

export interface ItemOwnerDetails {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ItemRead {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  condition: ItemCondition;
  status: ItemStatus;
  posted_date: string;
  updated_at: string | null;
  category: ItemCategory;
  owner_details: ItemOwnerDetails;
  image_urls: string[];
}

export interface ItemsListResponse {
  items: ItemRead[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ItemsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category_ids?: string[];
  conditions?: ItemCondition[];
  min_price?: number;
  max_price?: number;
  location?: string;
  sort?: ItemSort;
}

export interface ItemCreateRequest {
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  condition: ItemCondition;
  category_id: string;
  file_ids: string[];
}

export interface ItemUpdateRequest {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  location?: string;
  condition?: ItemCondition;
  category_id?: string;
  file_ids?: string[];
}
