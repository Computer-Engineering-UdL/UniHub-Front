import { environment } from '../../environments/environment';
import { API_VERSION_PATH } from '../../environments/environment.model';

const API_BASE_ORIGIN: string = environment.apiUrl.replace(API_VERSION_PATH, '');

function isAbsoluteUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  return /^https?:\/\//i.test(url.trim());
}

export function resolveFileUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  const trimmed: string = url.trim();
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  const pathWithLeadingSlash: string = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (pathWithLeadingSlash.startsWith(API_VERSION_PATH)) {
    return `${API_BASE_ORIGIN}${pathWithLeadingSlash}`;
  }

  return `${API_BASE_ORIGIN}${API_VERSION_PATH}${pathWithLeadingSlash}`;
}
