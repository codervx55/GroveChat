// app/chat/[id]/page.tsx — Individual conversation page
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";
import type { Profile } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // One round trip: participants + messages in parallel
  const [participantsRes, messagesRes] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", id),
    supabase
      .from("messages")
      .select(`*, sender:profiles(*)`)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const participantIds = (participantsRes.data ?? []).map((p) => p.user_id);

  // Verify user is a participant
  if (!participantIds.includes(user.id)) notFound();

  const otherUserId = participantIds.find((pid) => pid !== user.id);

  // One more round trip: both profiles in a single query
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", otherUserId ? [user.id, otherUserId] : [user.id]);

  const currentUserProfile =
    (profiles ?? []).find((p: Profile) => p.id === user.id) ?? null;
  const otherUser =
    (profiles ?? []).find((p: Profile) => p.id === otherUserId) ?? null;

  return (
    <ChatWindow
      conversationId={id}
      otherUser={otherUser}
      initialMessages={messagesRes.data ?? []}
      currentUser={currentUserProfile}
    />
  );
}
