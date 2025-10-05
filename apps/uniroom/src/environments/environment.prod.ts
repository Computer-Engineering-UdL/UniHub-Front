import { Environment, API_VERSION_PATH } from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://api.uniroom.com/' + API_VERSION_PATH,
};
