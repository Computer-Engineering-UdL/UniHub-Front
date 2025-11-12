export type OfferStatus = 'active' | 'inactive' | 'pending' | 'expired';
export type GenderPreference = 'any' | 'male' | 'female' | 'other';

export interface FileMetadata {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  uploaded_at: string;
  is_public: boolean;
  public_url?: string | null;
}

export interface OfferPhoto {
  id: string;
  order: number;
  category: string;
  file_id: string;
  url?: string | null;
  file_metadata?: FileMetadata | null;
  is_primary?: boolean;
}

export interface Offer {
  id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  offer_valid_until: string;
  city: string;
  address: string;
  start_date: string;
  end_date: string;
  deposit: number | null;
  num_rooms: number;
  num_bathrooms: number;
  furnished: boolean;
  utilities_included: boolean;
  internet_included: boolean;
  gender_preference: GenderPreference;
  status: OfferStatus;
  user_id: string;
  posted_date: string;
  photos?: OfferPhoto[] | null;
  photo_count?: number;
  base_image?: string | null;
  floor?: number | null;
  distance_from_campus?: string | null;
  utilities_cost?: number | null;
  utilities_description?: string | null;
  contract_type?: string | null;
  amenities?: OfferAmenity[] | null;
  rules?: OfferHouseRules | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
}

export type OfferAmenity =
  | string
  | number
  | {
      code?: string | number;
      key?: string;
      available?: boolean | null;
    };

export type OfferHouseRules = Record<string, boolean>;

export interface OfferListItem {
  id: string;
  title: string;
  price: number;
  priceFormatted?: string;
  area: number;
  areaFormatted?: string;
  status: OfferStatus;
  posted_date: string;
  city: string;
  base_image?: string | null;
  image?: string | null;
  currency?: string;
  description?: string;
  photo_count?: number;
  amenities?: OfferAmenity[] | null;
}

export interface CreateOfferData {
  category_id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  offer_valid_until: string;
  city: string;
  address: string;
  start_date: string;
  end_date: string;
  deposit: number | null;
  num_rooms: number;
  num_bathrooms: number;
  furnished: boolean;
  utilities_included: boolean;
  internet_included: boolean;
  gender_preference: GenderPreference;
  status: OfferStatus;
  user_id: string;
  floor?: number | null;
  distance_from_campus?: string | null;
  utilities_cost?: number | null;
  utilities_description?: string | null;
  contract_type?: string | null;
  amenities?: OfferAmenity[] | null;
  rules?: OfferHouseRules | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_ids?: string[] | null;
}
