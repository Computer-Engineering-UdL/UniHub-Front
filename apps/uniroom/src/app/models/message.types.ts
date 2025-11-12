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
  reply_message?: ChannelMessage;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  participant1?: User;
  participant2?: User;
  unread_count?: number;
}

export interface CreateMessageDto {
  conversation_id: string;
  content: string;
}

export interface ConversationWithOtherUser extends Conversation {
  other_user: User;
}
