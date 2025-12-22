export interface Terms {
  id: string;
  version: string;
  content: string;
  content_ca?: string;
  content_es?: string;
  content_en?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateTermsDto {
  version: string;
  content: string;
}

export interface UpdateTermsDto {
  version?: string;
  content?: string;
  content_ca?: string;
  content_es?: string;
  content_en?: string;
  is_active?: boolean;
}

export interface TermsFormData {
  version: string;
  content_ca: string;
  content_es: string;
  content_en: string;
}

export interface UserTermsAcceptance {
  id: string;
  user_id: string;
  terms_id: string;
  accepted_at: string;
  ip_address?: string;
}

export interface LatestTermsStatus {
  latest_terms_id: string;
  latest_version: string;
  accepted_latest: boolean;
  user_last_accepted_terms_id?: string;
  accepted_at?: string;
}
