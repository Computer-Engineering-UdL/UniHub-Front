// Environment configuration (development)
import { Environment, API_VERSION_PATH } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:8080' + API_VERSION_PATH,
  wsUrl: 'ws://localhost:8080'
};
