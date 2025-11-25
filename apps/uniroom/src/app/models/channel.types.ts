import { User } from './auth.types';

export type ChannelType = 'public' | 'private';
export type ChannelRole = 'Basic' | 'Seller' | 'Admin';
export type ChannelCategory = 'General' | 'Engineering' | 'Sciences' | 'Business' | 'Arts' | 'Medicine';

export interface ChannelMembership {
  id: string;
  user_id: string;
  channel_id: string;
  role: 'user' | 'member' | 'moderator' | 'admin';
  joined_at: string;
}

export interface ChannelBan {
  id: string;
  user_id: string;
  channel_id: string;
  banned_by: string;
  banned_at: string;
  reason?: string;
}

export interface Channel {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  category?: ChannelCategory;
  channel_type: ChannelType;
  channel_logo?: string;
  required_role_read: ChannelRole;
  required_role_write: ChannelRole;
  created_at: string;
  member_count?: number;
  members_count?: number;
  is_member?: boolean;
  memberships?: ChannelMembership[];
  bans?: ChannelBan[];
}

export interface ChannelMember {
  id?: string;
  user_id: string;
  channel_id: string;
  role: 'user' | 'member' | 'moderator' | 'admin';
  joined_at: string;
  is_banned: boolean;
  user?: User;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
  parent_message_id: string | null;
  parent_message?: ChannelMessage;
  sender_id?: string;
  reply_to?: string | null;
  sender?: User;
}

export interface CreateChannelDto {
  name: string;
  description: string;
  category: ChannelCategory;
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  category?: ChannelCategory;
}
