// app/chat/[id]/page.tsx — Individual conversation page
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";

interface Props {
  params: { id: string };
}

export default async function ConversationPage({ params }: Props) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Verify user is a participant
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!participant) notFound();

  // Get the other participant's profile
  const { data: otherParticipant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", params.id)
    .neq("user_id", user.id)
    .single();

  const { data: otherUser } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherParticipant?.user_id ?? "")
    .single();

  // Fetch initial messages (last 50)
  const { data: messages } = await supabase
    .from("messages")
    .select(`*, sender:profiles(*)`)
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Fetch current user profile
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ChatWindow
      conversationId={params.id}
      otherUser={otherUser}
      initialMessages={messages ?? []}
      currentUser={currentUserProfile}
    />
  );
}
