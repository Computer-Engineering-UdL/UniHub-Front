export type Role = 'Basic' | 'Seller' | 'Recruiter' | 'Admin';

export interface Interest {
  id: string;
  name: string;
}

export interface InterestCategory {
  id: string;
  name: string;
  interests: Interest[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  fullName?: string; // name + ' ' + lastName
  phone?: string;
  university?: string;
  provider?: 'local' | 'github' | 'google';
  role: Role;
  avatar_url?: string;
  imgUrl?: string;
  joinedDate?: string;
  yearOfStudy?: number;
  year_of_study?: number;
  isVerified?: boolean;
  is_verified?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  interests?: Interest[];
  faculty_id?: string;
  room_number?: string;
  created_at?: string;
  referral_code?: string;
  housing_offer_count?: number;
  housing_search_count?: number;
  listings_active?: number;
}

export const DEFAULT_USER_URL = 'assets/img/default-profile.png';

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  university?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RouteAccessData {
  public?: boolean;
  guestOnly?: boolean;
  roles?: Role[];
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
