// Environment configuration (development)
import { Environment, EnvironmentVersionUrl } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:8080/' + EnvironmentVersionUrl
};
