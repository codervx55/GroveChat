import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/chat/Sidebar";
import MobileLayout from "@/components/chat/MobileLayout";
import type { Message, Profile } from "@/types";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Round 1: profile + my conversation ids (parallel)
  const [{ data: profile }, { data: participantRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id),
  ]);

  const conversationIds = participantRows?.map((r) => r.conversation_id) ?? [];
  let conversations: any[] = [];

  if (conversationIds.length > 0) {
    // Round 2: everything for all conversations at once (parallel)
    const [convsRes, otherPartsRes, recentMsgsRes, unreadRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, updated_at, created_at")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false }),
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds)
        .neq("user_id", user.id),
      supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null),
    ]);

    // Round 3: all other users' profiles in one query
    const otherIds = (otherPartsRes.data ?? []).map((p) => p.user_id);
    const { data: otherProfiles } = otherIds.length
      ? await supabase.from("profiles").select("*").in("id", otherIds)
      : { data: [] as Profile[] };

    const profileById = new Map<string, Profile>(
      (otherProfiles ?? []).map((p: Profile) => [p.id, p])
    );
    const otherUserByConv = new Map<string, Profile | null>();
    for (const p of otherPartsRes.data ?? []) {
      otherUserByConv.set(p.conversation_id, profileById.get(p.user_id) ?? null);
    }

    const lastMsgByConv = new Map<string, Message>();
    for (const m of (recentMsgsRes.data ?? []) as Message[]) {
      if (!lastMsgByConv.has(m.conversation_id)) lastMsgByConv.set(m.conversation_id, m);
    }

    const unreadByConv = new Map<string, number>();
    for (const r of unreadRes.data ?? []) {
      unreadByConv.set(r.conversation_id, (unreadByConv.get(r.conversation_id) ?? 0) + 1);
    }

    conversations = (convsRes.data ?? []).map((conv) => ({
      ...conv,
      other_user: otherUserByConv.get(conv.id) ?? null,
      last_message: lastMsgByConv.get(conv.id) ?? null,
      unread_count: unreadByConv.get(conv.id) ?? 0,
    }));
  }

  return (
    <MobileLayout
      sidebar={
        <Sidebar
          currentUser={profile}
          conversations={conversations}
          currentUserId={user.id}
        />
      }
    >
      {children}
    </MobileLayout>
  );
}
