import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/chat/Sidebar";
import MobileLayout from "@/components/chat/MobileLayout";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  const conversationIds = participantRows?.map((r) => r.conversation_id) ?? [];
  let conversations: any[] = [];

  if (conversationIds.length > 0) {
    const { data } = await supabase
      .from("conversations")
      .select(`id, updated_at, created_at`)
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (data) {
      conversations = await Promise.all(
        data.map(async (conv) => {
          const { data: parts } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .neq("user_id", user.id)
            .single();

          let other_user = null;
          if (parts) {
            const { data: otherProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", parts.user_id)
              .single();
            other_user = otherProfile;
          }

          const { data: lastMsgs } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .is("read_at", null);

          return {
            ...conv,
            other_user,
            last_message: lastMsgs?.[0] ?? null,
            unread_count: count ?? 0,
          };
        })
      );
    }
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
