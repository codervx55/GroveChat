// lib/store.ts — Zustand global state for realtime chat
import { create } from "zustand";
import type { Message, Conversation, TypingIndicator } from "@/types";

type ChatStore = {
  // Messages keyed by conversation_id
  messages: Record<string, Message[]>;
  // All conversations for the sidebar
  conversations: Conversation[];
  // Active typing indicators
  typingUsers: TypingIndicator[];
  // Currently open conversation id
  activeConversationId: string | null;

  // Actions
  setConversations: (convs: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  setActiveConversation: (id: string | null) => void;
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (conversationId: string, userId: string) => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  conversations: [],
  typingUsers: [],
  activeConversationId: null,

  setConversations: (convs) => set({ conversations: convs }),

  upsertConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.findIndex((c) => c.id === conv.id);
      if (exists >= 0) {
        const updated = [...state.conversations];
        updated[exists] = conv;
        return { conversations: updated };
      }
      return { conversations: [conv, ...state.conversations] };
    }),

  setMessages: (conversationId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs },
    })),

  addMessage: (msg) =>
    set((state) => {
      const existing = state.messages[msg.conversation_id] ?? [];
      // Deduplicate by id
      if (existing.some((m) => m.id === msg.id)) return state;
      return {
        messages: {
          ...state.messages,
          [msg.conversation_id]: [...existing, msg],
        },
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (indicator) =>
    set((state) => {
      const filtered = state.typingUsers.filter(
        (t) =>
          !(
            t.conversation_id === indicator.conversation_id &&
            t.user_id === indicator.user_id
          )
      );
      return { typingUsers: [...filtered, indicator] };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (t) =>
          !(t.conversation_id === conversationId && t.user_id === userId)
      ),
    })),
}));
