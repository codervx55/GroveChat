"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import { markMessagesRead } from "@/lib/actions/chat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import { formatLastSeen } from "@/lib/utils";
import type { Message, Profile } from "@/types";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
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

  useEffect(() => {
    setMessages(conversationId, initialMessages);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages.length]);

  useEffect(() => {
    markMessagesRead(conversationId);
  }, [conversationId]);

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
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.sender_id)
            .single();
          const msg: Message = { ...payload.new, sender } as Message;
          addMessage(msg);
          if (payload.new.sender_id !== currentUser?.id) {
            markMessagesRead(conversationId);
          }
          router.refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  const typingInThisConv = typingUsers.filter(
    (t) => t.conversation_id === conversationId && t.user_id !== currentUser?.id
  );

  // Group by date
  const groups = convMessages.reduce((acc: { date: string; msgs: Message[] }[], msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric"
    });
    const last = acc[acc.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      acc.push({ date, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950">

      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border-b border-zinc-800/60 flex-shrink-0">
        <Link
          href="/chat"
          className="md:hidden p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative">
          <Avatar profile={otherUser} size="sm" />
          {otherUser?.is_online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-none mb-0.5">
            {otherUser?.username ?? "Unknown"}
          </p>
          <p className="text-[11px] truncate">
            {otherUser?.is_online
              ? <span className="text-emerald-400">online</span>
              : otherUser?.last_seen
              ? <span className="text-zinc-500">{formatLastSeen(otherUser.last_seen)}</span>
              : <span className="text-zinc-600">offline</span>
            }
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="relative mb-4">
              <Avatar profile={otherUser} size="lg" />
              {otherUser?.is_online && (
                <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
              )}
            </div>
            <p className="font-semibold text-white text-base mb-1">{otherUser?.username}</p>
            <p className="text-zinc-500 text-sm">Start a conversation</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.date}>
                {/* Date label */}
                <div className="flex items-center justify-center my-4">
                  <span className="text-[11px] text-zinc-500 bg-zinc-800/60 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>

                {group.msgs.map((msg, i) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const prev = group.msgs[i - 1];
                  const next = group.msgs[i + 1];
                  const isFirst = !prev || prev.sender_id !== msg.sender_id;
                  const isLast = !next || next.sender_id !== msg.sender_id;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMe={isMe}
                      isFirst={isFirst}
                      isLast={isLast}
                      otherUser={otherUser}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing */}
            {typingInThisConv.length > 0 && (
              <div className="flex items-end gap-2 mb-2">
                <Avatar profile={otherUser} size="sm" />
                <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
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
