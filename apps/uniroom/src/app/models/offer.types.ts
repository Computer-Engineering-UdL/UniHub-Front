export type OfferStatus = 'active' | 'inactive' | 'pending' | 'expired';
export type GenderPreference = 'any' | 'male' | 'female' | 'other';

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
  deposit: number;
  num_rooms: number;
  num_bathrooms: number;
  furnished: boolean;
  utilities_included: boolean;
  internet_included: boolean;
  gender_preference: GenderPreference;
  status: OfferStatus;
  user_id: string;
  posted_date: string;
  photos: OfferPhoto[];
}

export interface OfferPhoto {
  id: string;
  url: string;
  is_primary?: boolean;
}

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
  image?: string;
  currency?: string;
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
  deposit: number;
  num_rooms: number;
  num_bathrooms: number;
  furnished: boolean;
  utilities_included: boolean;
  internet_included: boolean;
  gender_preference: GenderPreference;
  status: OfferStatus;
  user_id: string;
}
