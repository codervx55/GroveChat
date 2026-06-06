"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Settings, LogOut, User, X, Loader2 } from "lucide-react";
import { cn, formatConversationTime, getInitials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { getOrCreateConversation } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Profile } from "@/types";
import toast from "react-hot-toast";

const LOGO = "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7212.png";

interface Props {
  currentUser: Profile | null;
  conversations: Conversation[];
  currentUserId: string;
}

export default function Sidebar({ currentUser, conversations, currentUserId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSearch(q: string) {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${q}%`)
      .neq("id", currentUserId)
      .limit(8);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  async function openConversation(userId: string) {
    startTransition(async () => {
      const result = await getOrCreateConversation(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setSearch("");
        setSearchResults([]);
        router.push(`/chat/${result.conversationId}`);
        router.refresh();
      }
    });
  }

  const activeConvId = pathname.split("/chat/")[1];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <img
              src={LOGO}
              alt="GroveChat"
              className="w-9 h-9 object-contain"
            />
            <span className="font-bold text-white text-xl tracking-tight">GroveChat</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={() => signOut()}
              className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-zinc-800 border border-zinc-700/50 rounded-2xl pl-10 pr-9 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSearchResults([]); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="mx-4 mb-3 bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700/50">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No users found</div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => openConversation(user.id)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 transition-colors text-left border-b border-zinc-700/30 last:border-0"
              >
                <Avatar profile={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                  {user.full_name && <p className="text-xs text-zinc-500 truncate">{user.full_name}</p>}
                </div>
                {user.is_online && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversations */}
      {!search && (
        <div className="flex-1 overflow-y-auto px-4" style={{ WebkitOverflowScrolling: "touch" }}>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Messages</p>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <img src={LOGO} alt="GroveChat" className="w-14 h-14 object-contain mb-4 opacity-50" />
              <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
              <p className="text-xs text-zinc-600 mt-1">Search for a user to start chatting</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConvId === conv.id}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Avatar profile={currentUser} size="sm" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{currentUser?.username ?? "You"}</p>
          <p className="text-xs text-emerald-400">Online</p>
        </div>
        <Link href="/profile" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <User className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function ConversationItem({ conv, isActive, currentUserId }: {
  conv: Conversation; isActive: boolean; currentUserId: string;
}) {
  const other = conv.other_user;
  const lastMsg = conv.last_message;
  const unread = conv.unread_count ?? 0;

  return (
    <Link
      href={`/chat/${conv.id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all",
        isActive ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-zinc-800"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar profile={other ?? null} size="md" />
        {other?.is_online && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm truncate", unread > 0 ? "font-bold text-white" : "font-medium text-zinc-200")}>
            {other?.username ?? "Unknown"}
          </p>
          {lastMsg && (
            <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
              {formatConversationTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={cn("text-xs truncate max-w-[170px]", unread > 0 ? "text-zinc-300" : "text-zinc-500")}>
            {lastMsg
              ? lastMsg.sender_id === currentUserId
                ? `You: ${lastMsg.content}`
                : lastMsg.content
              : "No messages yet"}
          </p>
          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Avatar({ profile, size = "md" }: {
  profile: Profile | null; size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.username}
        className={cn("rounded-full object-cover flex-shrink-0 bg-zinc-800", sizes[size])}
      />
    );
  }

  return (
    <div className={cn(
      "rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 font-semibold text-white",
      sizes[size]
    )}>
      {profile ? getInitials(profile.full_name ?? profile.username) : "?"}
    </div>
  );
}
