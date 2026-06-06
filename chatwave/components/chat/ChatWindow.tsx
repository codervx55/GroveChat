// components/chat/ChatWindow.tsx — Full chat window with realtime
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import { markMessagesRead } from "@/lib/actions/chat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import { formatLastSeen } from "@/lib/utils";
import type { Message, Profile } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  conversationId: string;
  otherUser: Profile | null;
  initialMessages: Message[];
  currentUser: Profile | null;
}

export default function ChatWindow({
  conversationId,
  otherUser,
  initialMessages,
  currentUser,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, addMessage, typingUsers } = useChatStore();

  const convMessages = messages[conversationId] ?? initialMessages;

  // Seed store with initial messages
  useEffect(() => {
    setMessages(conversationId, initialMessages);
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages.length]);

  // Mark messages read when opening
  useEffect(() => {
    markMessagesRead(conversationId);
  }, [conversationId]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.sender_id)
            .single();

          const msg: Message = { ...payload.new, sender } as Message;
          addMessage(msg);

          // Auto-mark as read if from other user
          if (payload.new.sender_id !== currentUser?.id) {
            markMessagesRead(conversationId);
          }

          router.refresh(); // refresh sidebar unread counts
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  const typingInThisConv = typingUsers.filter(
    (t) => t.conversation_id === conversationId && t.user_id !== currentUser?.id
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        {/* Back button (mobile) */}
        <Link href="/chat" className="md:hidden text-zinc-400 hover:text-white mr-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative flex-shrink-0">
          <Avatar profile={otherUser} size="md" />
          {otherUser?.is_online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white text-sm truncate">
            {otherUser?.username ?? "Unknown"}
          </h2>
          <p className="text-xs text-zinc-500 truncate">
            {otherUser?.is_online
              ? <span className="text-emerald-400">Online</span>
              : otherUser?.last_seen
              ? `Last seen ${formatLastSeen(otherUser.last_seen)}`
              : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <Avatar profile={otherUser} size="md" />
            </div>
            <p className="text-white font-semibold">{otherUser?.username}</p>
            <p className="text-zinc-500 text-sm mt-1">
              Say hello! This is the beginning of your conversation.
            </p>
          </div>
        ) : (
          <>
            {convMessages.map((msg, i) => {
              const isMe = msg.sender_id === currentUser?.id;
              const prevMsg = convMessages[i - 1];
              const showAvatar = !isMe && (
                !prevMsg || prevMsg.sender_id !== msg.sender_id
              );

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  otherUser={otherUser}
                />
              );
            })}

            {/* Typing indicator */}
            {typingInThisConv.length > 0 && (
              <div className="flex items-end gap-2 mb-2">
                <Avatar profile={otherUser} size="sm" />
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        currentUser={currentUser}
        otherUserId={otherUser?.id ?? ""}
      />
    </div>
  );
}
