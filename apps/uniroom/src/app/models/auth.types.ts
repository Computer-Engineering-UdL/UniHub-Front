export type Role = 'Basic' | 'Seller' | 'Admin';
export const ALL_ROLES: Role[] = ['Basic', 'Seller', 'Admin'];

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  university?: string;
  provider?: 'local' | 'github' | 'google';
  role: Role;
}

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
