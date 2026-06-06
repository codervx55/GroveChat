"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import { markMessagesRead } from "@/lib/actions/chat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import { formatLastSeen } from "@/lib/utils";
import type { Message, Profile } from "@/types";
import { ArrowLeft, Phone, Video, MoreVertical, X, MapPin, Calendar, Info } from "lucide-react";
import Link from "next/link";

interface Props {
  conversationId: string;
  otherUser: Profile | null;
  initialMessages: Message[];
  currentUser: Profile | null;
}

export default function ChatWindow({ conversationId, otherUser, initialMessages, currentUser }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showProfile, setShowProfile] = useState(false);
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
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const { data: sender } = await supabase.from("profiles").select("*").eq("id", payload.new.sender_id).single();
        addMessage({ ...payload.new, sender } as Message);
        if (payload.new.sender_id !== currentUser?.id) markMessagesRead(conversationId);
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  const typingHere = typingUsers.filter(t => t.conversation_id === conversationId && t.user_id !== currentUser?.id);

  const groups = convMessages.reduce((acc: { date: string; msgs: Message[] }[], msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    const last = acc[acc.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden">
      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 z-10">
          <Link href="/chat" className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <button onClick={() => setShowProfile(true)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <div className="relative flex-shrink-0">
              <Avatar profile={otherUser} size="sm" />
              {otherUser?.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{otherUser?.username}</p>
              <p className="text-[11px] leading-tight">
                {otherUser?.is_online
                  ? <span className="text-emerald-400">online</span>
                  : <span className="text-zinc-500">{otherUser?.last_seen ? formatLastSeen(otherUser.last_seen) : "offline"}</span>
                }
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Phone className="w-[17px] h-[17px]" />
            </button>
            <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Video className="w-[17px] h-[17px]" />
            </button>
            <button onClick={() => setShowProfile(true)} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Info className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>

        {/* Messages — THIS IS THE SCROLLABLE AREA */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ minHeight: 0 }}
        >
          <div className="px-3 py-4 space-y-0.5">
            {convMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-2 ring-zinc-700">
                  <Avatar profile={otherUser} size="lg" />
                </div>
                <p className="font-semibold text-white mb-1">{otherUser?.username}</p>
                <p className="text-zinc-500 text-sm">No messages yet. Say hi! 👋</p>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center justify-center my-5">
                      <span className="text-[11px] text-zinc-500 bg-zinc-800/80 px-3 py-1 rounded-full border border-zinc-700/30">
                        {group.date}
                      </span>
                    </div>
                    {group.msgs.map((msg, i) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      const prev = group.msgs[i - 1];
                      const next = group.msgs[i + 1];
                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isMe={isMe}
                          isFirst={!prev || prev.sender_id !== msg.sender_id}
                          isLast={!next || next.sender_id !== msg.sender_id}
                          otherUser={otherUser}
                        />
                      );
                    })}
                  </div>
                ))}

                {typingHere.length > 0 && (
                  <div className="flex items-end gap-2 py-1 msg-in">
                    <Avatar profile={otherUser} size="sm" />
                    <div className="bg-zinc-800 rounded-2xl rounded-bl px-3.5 py-2.5 flex items-center gap-1">
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
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
          <MessageInput conversationId={conversationId} currentUser={currentUser} otherUserId={otherUser?.id ?? ""} />
        </div>
      </div>

      {/* Profile panel */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div
            className="w-full md:w-80 bg-zinc-900 rounded-t-3xl md:rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-zinc-300">Profile</span>
              <button onClick={() => setShowProfile(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex flex-col items-center px-6 pb-5 pt-3">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-zinc-700">
                  <Avatar profile={otherUser} size="lg" />
                </div>
                {otherUser?.is_online && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{otherUser?.username}</h2>
              {otherUser?.full_name && (
                <p className="text-sm text-zinc-400 mt-0.5">{otherUser.full_name}</p>
              )}
              <span className={`mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${otherUser?.is_online ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                {otherUser?.is_online ? "● Online" : "Offline"}
              </span>
            </div>

            {/* Bio */}
            {otherUser?.bio && (
              <div className="mx-4 mb-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/30">
                <p className="text-sm text-zinc-300 leading-relaxed">{otherUser.bio}</p>
              </div>
            )}

            {/* Info rows */}
            <div className="mx-4 mb-4 divide-y divide-zinc-800">
              <div className="flex items-center gap-3 py-3">
                <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Joined</p>
                  <p className="text-sm text-zinc-200">
                    {otherUser?.created_at ? new Date(otherUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-6">
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors border border-zinc-700">
                <Video className="w-4 h-4" /> Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
