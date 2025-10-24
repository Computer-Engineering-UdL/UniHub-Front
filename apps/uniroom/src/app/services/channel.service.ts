import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';
import { Channel, ChannelMember, CreateChannelDto, UpdateChannelDto } from '../models/channel.types';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);

  private channelsSubject: BehaviorSubject<Channel[]> = new BehaviorSubject<Channel[]>([]);
  public channels$: Observable<Channel[]> = this.channelsSubject.asObservable();

  private buildAuthHeaders(): HttpHeaders {
    const token: string | null = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  async fetchChannels(): Promise<Channel[]> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    const channels: Channel[] = await firstValueFrom(
      this.apiService.get<Channel[]>('api/v1/channel', undefined, headers)
    );
    this.channelsSubject.next(channels);
    return channels;
  }

  async fetchChannelById(channelId: string): Promise<Channel> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    return await firstValueFrom(this.apiService.get<Channel>(`api/v1/channel/${channelId}`, undefined, headers));
  }

  async createChannel(data: CreateChannelDto): Promise<Channel> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    const channel: Channel = await firstValueFrom(this.apiService.post<Channel>(`api/v1/channel`, data, headers));
    await this.fetchChannels();
    return channel;
  }

  async updateChannel(channelId: string, data: UpdateChannelDto): Promise<Channel> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    const channel: Channel = await firstValueFrom(
      this.apiService.patch<Channel>(`api/v1/channel/${channelId}`, data, headers)
    );
    await this.fetchChannels();
    return channel;
  }

  async deleteChannel(channelId: string): Promise<void> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.delete<void>(`api/v1/channel/${channelId}`, undefined, headers));
    await this.fetchChannels();
  }

  async joinChannel(channelId: string, memberId: string): Promise<void> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.post<void>(`api/v1/channel/${channelId}/add_member/${memberId}`, {}, headers));
    await this.fetchChannels();
  }

  async leaveChannel(channelId: string, memberId: string): Promise<void> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    await firstValueFrom(
      this.apiService.post<void>(`api/v1/channel/${channelId}/remove_member/${memberId}`, {}, headers)
    );
    await this.fetchChannels();
  }

  async banMember(channelId: string, data: { user_id: string }): Promise<void> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.post<void>(`api/v1/channel/${channelId}/ban`, data, headers));
  }

  async unbanMember(channelId: string, data: { user_id: string }): Promise<void> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    await firstValueFrom(this.apiService.post<void>(`api/v1/channel/${channelId}/unban`, data, headers));
  }

  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    return await firstValueFrom(
      this.apiService.get<ChannelMember[]>(`api/v1/channel/${channelId}/members`, undefined, headers)
    );
  }

  async getMemberInfo(channelId: string, userId: string): Promise<ChannelMember> {
    const headers: HttpHeaders = this.buildAuthHeaders();
    return await firstValueFrom(
      this.apiService.get<ChannelMember>(`api/v1/channel/${channelId}/member/${userId}`, undefined, headers)
    );
  }
}
