import { Environment, EnvironmentVersionUrl } from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://api.uniroom.com/' + EnvironmentVersionUrl
};
