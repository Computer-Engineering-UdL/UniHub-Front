export interface Environment {
  production: boolean;
  apiUrl: string;
  wsUrl?: string;
}

export const API_VERSION_PATH = '/api/v1';
