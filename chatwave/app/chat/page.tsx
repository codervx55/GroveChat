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

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!participant) notFound();

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

  const { data: messages } = await supabase
    .from("messages")
    .select(`*, sender:profiles(*)`)
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    // Full screen on mobile
    <div className="fixed inset-0 md:relative md:inset-auto flex flex-col bg-zinc-950 z-50">
      <ChatWindow
        conversationId={params.id}
        otherUser={otherUser}
        initialMessages={messages ?? []}
        currentUser={currentUserProfile}
      />
    </div>
  );
}
