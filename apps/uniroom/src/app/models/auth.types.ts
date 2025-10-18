export type Role = 'Basic' | 'Seller' | 'Admin';

export interface Interest {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  university?: string;
  provider?: 'local' | 'github' | 'google';
  role: Role;
  avatar_url?: string;
  imgUrl?: string;
  joinedDate?: string;
  yearOfStudy?: number;
  isVerified?: boolean;
  interests?: Interest[];
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
