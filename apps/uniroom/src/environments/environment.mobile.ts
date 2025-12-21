// Environment configuration (mobile development)
import { Environment, API_VERSION_PATH } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://10.0.2.2:8080' + API_VERSION_PATH,
  wsUrl: 'ws://10.0.2.2:8080'
};
