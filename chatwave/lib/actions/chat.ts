// lib/actions/chat.ts — Server Actions for conversations & messages
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Send a message in a conversation */
export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { error: "Message must be 1–2000 characters." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: error.message };

  // Update conversation updated_at so it bubbles to top of list
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/chat/${conversationId}`);
  return { success: true };
}

/** Find or create a 1-on-1 conversation between two users */
export async function getOrCreateConversation(otherUserId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (user.id === otherUserId) return { error: "Cannot chat with yourself." };

  // Find existing conversation that includes both users
  const { data: existing } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (existing && existing.length > 0) {
    const myConvIds = existing.map((r) => r.conversation_id);
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvIds);

    if (shared && shared.length > 0) {
      return { conversationId: shared[0].conversation_id };
    }
  }

  // Create new conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({})
    .select()
    .single();

  if (convErr || !conv) return { error: "Failed to create conversation." };

  // Add both participants
  await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);

  return { conversationId: conv.id };
}

/** Mark all unread messages in a conversation as read */
export async function markMessagesRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}

/** Update user profile */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const username = formData.get("username") as string;
  const full_name = formData.get("full_name") as string;
  const bio = formData.get("bio") as string;

  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, full_name, bio, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

/** Upload avatar and update profile */
export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > 2 * 1024 * 1024) return { error: "File must be under 2MB." };
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { success: true, url: publicUrl };
}
