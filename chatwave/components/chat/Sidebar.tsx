// components/chat/Sidebar.tsx — Left sidebar with conversations
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Search, Settings, LogOut, User, X, Loader2 } from "lucide-react";
import { cn, formatConversationTime, getInitials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { getOrCreateConversation } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Profile } from "@/types";
import toast from "react-hot-toast";

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

  // Search users by username
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

  // Start or open conversation with a user
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

  async function handleSignOut() {
    await signOut();
  }

  const activeConvId = pathname.split("/chat/")[1];

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">GroveChat</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="border-b border-zinc-800 overflow-y-auto max-h-60">
          {searching ? (
            <div className="flex items-center justify-center py-6 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No users found</div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => openConversation(user.id)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <Avatar profile={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  {user.full_name && (
                    <p className="text-xs text-zinc-500 truncate">{user.full_name}</p>
                  )}
                </div>
                {user.is_online && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {!search && (
          <>
            <div className="px-4 py-2.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Messages
              </p>
            </div>

            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500">No conversations yet</p>
                <p className="text-xs text-zinc-600 mt-1">Search for a user to start chatting</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConvId === conv.id}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Current user footer */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Avatar profile={currentUser} size="sm" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{currentUser?.username ?? "You"}</p>
          <p className="text-xs text-emerald-400">Online</p>
        </div>
        <Link href="/profile" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <User className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}

// ── Conversation list item ────────────────────────────────────────────────────
function ConversationItem({
  conv,
  isActive,
  currentUserId,
}: {
  conv: Conversation;
  isActive: boolean;
  currentUserId: string;
}) {
  const other = conv.other_user;
  const lastMsg = conv.last_message;
  const unread = conv.unread_count ?? 0;

  return (
    <Link
      href={`/chat/${conv.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800 border-l-2",
        isActive
          ? "bg-zinc-800 border-blue-500"
          : "border-transparent"
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
          <p className={cn("text-sm truncate", unread > 0 ? "font-semibold text-white" : "font-medium text-zinc-200")}>
            {other?.username ?? "Unknown"}
          </p>
          {lastMsg && (
            <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
              {formatConversationTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={cn("text-xs truncate max-w-[160px]", unread > 0 ? "text-zinc-300" : "text-zinc-500")}>
            {lastMsg
              ? lastMsg.sender_id === currentUserId
                ? `You: ${lastMsg.content}`
                : lastMsg.content
              : "No messages yet"}
          </p>
          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Avatar component ──────────────────────────────────────────────────────────
export function Avatar({
  profile,
  size = "md",
}: {
  profile: Profile | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
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
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 font-semibold text-white",
        sizes[size]
      )}
    >
      {profile ? getInitials(profile.full_name ?? profile.username) : "?"}
    </div>
  );
}
