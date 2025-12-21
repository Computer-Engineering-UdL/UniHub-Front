import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { LatestTermsStatus, Terms, UserTermsAcceptance } from '../models/terms.types';

@Injectable({ providedIn: 'root' })
export class TermsService {
  private readonly apiService: ApiService = inject(ApiService);

  async getAllTerms(): Promise<Terms[]> {
    return await firstValueFrom(this.apiService.get<Terms[]>('terms/'));
  }

  async getTermsById(termsId: string): Promise<Terms> {
    return await firstValueFrom(this.apiService.get<Terms>(`terms/${termsId}`));
  }

  async getTermsByVersion(version: string): Promise<Terms> {
    return await firstValueFrom(this.apiService.get<Terms>(`terms/version/${version}`));
  }

  async createTerms(data: {
    version: string;
    content: string;
    content_ca?: string;
    content_es?: string;
    content_en?: string;
  }): Promise<Terms> {
    return await firstValueFrom(this.apiService.post<Terms>('terms/', data));
  }

  async updateTerms(termsId: string, data: Partial<Terms>): Promise<Terms> {
    return await firstValueFrom(this.apiService.patch<Terms>(`terms/${termsId}`, data));
  }

  async deleteTerms(termsId: string): Promise<void> {
    await firstValueFrom(this.apiService.delete(`terms/${termsId}`));
  }

  async checkLatestTermsStatus(): Promise<LatestTermsStatus> {
    return await firstValueFrom(this.apiService.get<LatestTermsStatus>('user_terms/latest-status'));
  }

  async acceptLatestTerms(): Promise<UserTermsAcceptance> {
    return await firstValueFrom(this.apiService.post<UserTermsAcceptance>('user_terms/accept', {}));
  }

  async getUserTermsAcceptances(): Promise<UserTermsAcceptance[]> {
    return await firstValueFrom(this.apiService.get<UserTermsAcceptance[]>('user_terms/user/list'));
  }
}
