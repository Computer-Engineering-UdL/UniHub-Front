import { User } from './auth.types';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  sender?: User;
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
  sender?: User;
  sender_id?: string;
  reply_to?: string;
  parent_message?: ChannelMessage;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  housing_offer_id?: string | null;
  created_at: string;
  updated_at?: string;
  last_message_at?: string | null;
  last_message?: Message | null;
  unread_count?: number;
}

export interface CreateMessageDto {
  conversation_id: string;
  content: string;
}

export interface ConversationWithOtherUser extends Conversation {
  other_user?: User | null;
}
