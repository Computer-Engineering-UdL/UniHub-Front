export interface Channel {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  member_count: number;
  is_member?: boolean;
}

export interface ChannelMember {
  id: string;
  user_id: string;
  channel_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  is_banned: boolean;
}

export interface CreateChannelDto {
  name: string;
  description: string;
  category: string;
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  category?: string;
}

export type ChannelCategory = 'General' | 'Engineering' | 'Sciences' | 'Business' | 'Arts' | 'Medicine';

