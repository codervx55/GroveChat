// types/index.ts — Global TypeScript types for GroveChat

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  other_user?: Profile;
  last_message?: Message | null;
  unread_count?: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  // Joined fields
  sender?: Profile;
};

export type TypingIndicator = {
  conversation_id: string;
  user_id: string;
  username: string;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
};
