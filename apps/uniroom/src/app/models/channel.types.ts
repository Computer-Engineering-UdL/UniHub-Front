export type ChannelType = 'public' | 'private';
export type ChannelRole = 'Basic' | 'Seller' | 'Admin';

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

export interface ChannelMembership {
  id: string;
  user_id: string;
  channel_id: string;
  role: 'member' | 'moderator' | 'admin';
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

export interface ChannelMember {
  id: string;
  user_id: string;
  channel_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  is_banned: boolean;
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

export type ChannelCategory = 'General' | 'Engineering' | 'Sciences' | 'Business' | 'Arts' | 'Medicine';
