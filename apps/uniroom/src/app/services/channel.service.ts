import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Channel, ChannelMember, CreateChannelDto, UpdateChannelDto } from '../models/channel.types';
import { ChannelMessage } from '../models/message.types';
import { User } from '../models/auth.types';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);

  private channelsSubject: BehaviorSubject<Channel[]> = new BehaviorSubject<Channel[]>([]);
  public channels$: Observable<Channel[]> = this.channelsSubject.asObservable();

  async fetchChannels(): Promise<Channel[]> {
    const channels: Channel[] = await firstValueFrom(this.apiService.get<Channel[]>('channel/'));
    channels.forEach((channel: Channel): void => {
      this.extractEmojiFromName(channel);
    });
    this.channelsSubject.next(channels);
    return channels;
  }

  private extractEmojiFromName(channel: Channel): void {
    const emojiRegex: RegExp = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
    const match: RegExpMatchArray | null = channel.name.match(emojiRegex);

    if (match) {
      channel.emoji = match[0].trim();
      channel.name = channel.name.replace(emojiRegex, '').trim();
    }
  }

  async fetchChannelById(channelId: string): Promise<Channel> {
    const channel: Channel = await firstValueFrom(this.apiService.get<Channel>(`channel/${channelId}`));
    this.extractEmojiFromName(channel);
    return channel;
  }

  async createChannel(data: CreateChannelDto): Promise<Channel> {
    const channel: Channel = await firstValueFrom(this.apiService.post<Channel>(`channel/`, data));
    await this.fetchChannels();
    return channel;
  }

  async updateChannel(channelId: string, data: UpdateChannelDto): Promise<Channel> {
    const channel: Channel = await firstValueFrom(this.apiService.patch<Channel>(`channel/${channelId}`, data));
    await this.fetchChannels();
    return channel;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await firstValueFrom(this.apiService.delete<void>(`channel/${channelId}`));
    await this.fetchChannels();
  }

  async joinChannel(channelId: string): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/join`, {}));
    await this.fetchChannels();
  }

  async leaveChannel(channelId: string): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/leave`, {}));
    await this.fetchChannels();
  }

  async banMember(channelId: string, data: { user_id: string; motive: string; duration_days: number }): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/ban`, data));
  }

  async unbanMember(channelId: string, data: { user_id: string; motive: string }): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/unban`, data));
  }

  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    return await firstValueFrom(this.apiService.get<ChannelMember[]>(`channel/${channelId}/members`));
  }

  async getMemberInfo(channelId: string, userId: string): Promise<ChannelMember> {
    return await firstValueFrom(this.apiService.get<ChannelMember>(`channel/${channelId}/member/${userId}`));
  }

  async getChannelMessages(channelId: string): Promise<ChannelMessage[]> {
    const messages: ChannelMessage[] = await firstValueFrom(
      this.apiService.get<ChannelMessage[]>(`channel/${channelId}/messages`)
    );

    return await Promise.all(
      messages.map(async (msg: ChannelMessage): Promise<ChannelMessage> => {
        try {
          const sender: User = this.authService.mapUserFromApi(
            await firstValueFrom(this.apiService.get<User>(`user/public/${msg.user_id}`))
          );

          let parentMessage: ChannelMessage | undefined;
          if (msg.parent_message_id) {
            try {
              const parentMsgData: ChannelMessage = await firstValueFrom(
                this.apiService.get<ChannelMessage>(`channel/${channelId}/messages/${msg.parent_message_id}`)
              );
              const parentSender: User = this.authService.mapUserFromApi(
                await firstValueFrom(this.apiService.get<User>(`user/public/${parentMsgData.user_id}`))
              );
              parentMessage = {
                ...parentMsgData,
                sender_id: parentMsgData.user_id,
                reply_to: parentMsgData.parent_message_id ?? undefined,
                sender: parentSender
              };
            } catch {
              // Parent message not found or error fetching it
            }
          }

          return {
            ...msg,
            sender_id: msg.user_id,
            reply_to: msg.parent_message_id ?? undefined,
            sender,
            parent_message: parentMessage
          };
        } catch {
          return {
            ...msg,
            sender_id: msg.user_id,
            reply_to: msg.parent_message_id ?? undefined
          };
        }
      })
    );
  }

  async sendChannelMessage(channelId: string, userId: string, content: string): Promise<ChannelMessage> {
    return await firstValueFrom(
      this.apiService.post<ChannelMessage>(`channel/${channelId}/messages`, {
        channel_id: channelId,
        user_id: userId,
        content
      })
    );
  }

  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    await firstValueFrom(this.apiService.delete<void>(`channel/${channelId}/messages/${messageId}`));
  }

  async updateChannelMessage(channelId: string, messageId: string, content: string): Promise<ChannelMessage> {
    return await firstValueFrom(
      this.apiService.put<ChannelMessage>(`channel/${channelId}/messages/${messageId}`, { content })
    );
  }

  async replyToChannelMessage(
    channelId: string,
    messageId: string,
    userId: string,
    content: string
  ): Promise<ChannelMessage> {
    return await firstValueFrom(
      this.apiService.post<ChannelMessage>(`channel/${channelId}/messages/${messageId}/reply`, {
        channel_id: channelId,
        user_id: userId,
        content
      })
    );
  }

  async addMember(channelId: string, memberId: string): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/add_member/${memberId}`, {}));
  }

  async removeMember(channelId: string, memberId: string): Promise<void> {
    await firstValueFrom(this.apiService.post<void>(`channel/${channelId}/remove_member/${memberId}`, {}));
  }

  async setMemberRole(channelId: string, memberId: string, role: 'moderator' | 'admin' | 'user'): Promise<void> {
    await firstValueFrom(
      this.apiService.post<void>(`channel/${channelId}/set_role`, { user_id: memberId, new_role: role })
    );
  }
}
