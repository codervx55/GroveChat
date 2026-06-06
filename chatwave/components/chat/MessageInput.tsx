"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, Send, Paperclip, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

interface Props {
  conversationId: string;
  currentUser: Profile | null;
  otherUserId: string;
}

export default function MessageInput({ conversationId, currentUser, otherUserId }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const supabase = createClient();
  const { setTyping, clearTyping } = useChatStore();

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  useEffect(() => {
    if (!showEmoji) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".emoji-wrap") && !t.closest(".emoji-toggle-btn")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showEmoji]);

  const broadcastTyping = useCallback(() => {
    if (!currentUser) return;
    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast", event: "typing",
      payload: { user_id: currentUser.id, username: currentUser.username, conversation_id: conversationId },
    });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      supabase.channel(`typing:${conversationId}`).send({
        type: "broadcast", event: "stop_typing",
        payload: { user_id: currentUser.id, conversation_id: conversationId },
      });
    }, 2000);
  }, [conversationId, currentUser]);

  useEffect(() => {
    const ch = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id !== currentUser?.id) setTyping(payload);
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        clearTyping(payload.conversation_id, payload.user_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, currentUser?.id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !currentUser) return null;

    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `public/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(path, imageFile, {
        upsert: true,
        contentType: imageFile.type,
      });

    if (error) {
      toast.error(error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("chat-images")
      .getPublicUrl(path);

    return publicUrl;
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;
    if (sending || uploadingImage) return;

    if (imageFile) {
      setUploadingImage(true);
      const imageUrl = await uploadImage();
      setUploadingImage(false);
      if (!imageUrl) return;

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser?.id,
        content: trimmed || "📷 Image",
        image_url: imageUrl,
      });

      if (error) toast.error("Failed to send image");
      setImageFile(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
    }

    if (trimmed) {
      setSending(true);
      setText("");
      clearTimeout(typingTimeout.current);
      const result = await sendMessage(conversationId, trimmed);
      if (result.error) { toast.error(result.error); setText(trimmed); }
      setSending(false);
    }

    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function pickEmoji(data: { emoji: string }) {
    const el = inputRef.current;
    if (el) {
      const s = el.selectionStart ?? text.length;
      const e2 = el.selectionEnd ?? text.length;
      setText(text.slice(0, s) + data.emoji + text.slice(e2));
      requestAnimationFrame(() => {
        el.focus();
        const p = s + data.emoji.length;
        el.setSelectionRange(p, p);
      });
    } else {
      setText(text + data.emoji);
    }
  }

  const hasContent = text.trim().length > 0 || !!imageFile;

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-2">
      {showEmoji && (
        <div className="emoji-wrap absolute bottom-20 left-2 z-50 rounded-xl overflow-hidden shadow-2xl">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={pickEmoji}
            width={300}
            height={340}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-20 w-auto rounded-xl object-cover border border-zinc-700"
          />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          {uploadingImage && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => setShowEmoji(v => !v)}
          className={cn(
            "emoji-toggle-btn flex-shrink-0 p-2 rounded-full transition-colors mb-0.5",
            showEmoji ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 bg-zinc-800 rounded-2xl px-3.5 py-2.5 border border-zinc-700/40 focus-within:border-zinc-600 transition-colors">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); broadcastTyping(); }}
            onKeyDown={handleKey}
            placeholder="Message"
            rows={1}
            className="w-full bg-transparent text-[14px] text-white placeholder:text-zinc-500 resize-none outline-none leading-snug"
            style={{ minHeight: "20px", maxHeight: "120px" }}
          />
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors mb-0.5"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {hasContent ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || uploadingImage}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-500/20 mb-0.5"
          >
            {sending || uploadingImage
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4 text-white" style={{ marginLeft: "1px" }} />
            }
          </button>
        ) : (
          <button
            type="button"
            className="flex-shrink-0 p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors mb-0.5"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
