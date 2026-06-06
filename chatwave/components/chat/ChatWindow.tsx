"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import { markMessagesRead } from "@/lib/actions/chat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import { formatLastSeen } from "@/lib/utils";
import type { Message, Profile } from "@/types";
import { ArrowLeft, Phone, Video, MoreVertical, Search } from "lucide-react";
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
  const messagesRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, addMessage, typingUsers } = useChatStore();
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const convMessages = messages[conversationId] ?? initialMessages;

  useEffect(() => {
    setMessages(conversationId, initialMessages);
  }, [conversationId]);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToBottom(convMessages.length === initialMessages.length);
  }, [convMessages.length]);

  useEffect(() => {
    markMessagesRead(conversationId);
  }, [conversationId]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Realtime subscription
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

  // Group messages by date
  const groupedMessages = convMessages.reduce((groups: { date: string; messages: Message[] }[], msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] glass-dark flex-shrink-0">
        <Link href="/chat" className="md:hidden p-2 -ml-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative cursor-pointer group">
          <Avatar profile={otherUser} size="md" />
          {otherUser?.is_online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f] online-ring" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white text-[15px] truncate leading-tight">
            {otherUser?.username ?? "Unknown"}
          </h2>
          <p className="text-xs truncate mt-0.5">
            {otherUser?.is_online ? (
              <span className="text-emerald-400 font-medium">Active now</span>
            ) : otherUser?.last_seen ? (
              <span className="text-zinc-500">Last seen {formatLastSeen(otherUser.last_seen)}</span>
            ) : (
              <span className="text-zinc-600">Offline</span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <Phone className="w-4.5 h-4.5" style={{width: '18px', height: '18px'}} />
          </button>
          <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <Video className="w-4.5 h-4.5" style={{width: '18px', height: '18px'}} />
          </button>
          <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <MoreVertical className="w-4.5 h-4.5" style={{width: '18px', height: '18px'}} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1 relative z-10"
        style={{ scrollbarWidth: 'thin' }}
      >
        {convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl overflow-hidden ring-2 ring-white/10">
                <Avatar profile={otherUser} size="lg" />
              </div>
              {otherUser?.is_online && (
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f]" />
              )}
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">{otherUser?.username}</h3>
            {otherUser?.bio && <p className="text-zinc-500 text-sm mb-4 max-w-xs">{otherUser.bio}</p>}
            <div className="glass rounded-2xl px-4 py-2.5">
              <p className="text-zinc-400 text-sm">👋 Say hello to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] font-medium text-zinc-600 px-3 py-1 glass rounded-full">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <div className="space-y-1">
                  {group.messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const prevMsg = group.messages[i - 1];
                    const nextMsg = group.messages[i + 1];
                    const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    const isLast = !nextMsg || nextMsg.sender_id !== msg.sender_id;

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
              </div>
            ))}

            {/* Typing indicator */}
            {typingInThisConv.length > 0 && (
              <div className="flex items-end gap-2 mt-2 msg-enter">
                <div className="w-7 h-7 flex-shrink-0">
                  <Avatar profile={otherUser} size="sm" />
                </div>
                <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-4 z-20 w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white shadow-lg transition-all hover:scale-110"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      )}

      {/* Input */}
      <div className="relative z-10 flex-shrink-0">
        <MessageInput
          conversationId={conversationId}
          currentUser={currentUser}
          otherUserId={otherUser?.id ?? ""}
        />
      </div>
    </div>
  );
}
