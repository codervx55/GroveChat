"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, Send, Paperclip, Mic } from "lucide-react";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".emoji-picker-wrap") && !t.closest(".emoji-toggle")) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  const broadcastTyping = useCallback(() => {
    if (!currentUser) return;
    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUser.id, username: currentUser.username, conversation_id: conversationId },
    });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      supabase.channel(`typing:${conversationId}`).send({
        type: "broadcast",
        event: "stop_typing",
        payload: { user_id: currentUser.id, conversation_id: conversationId },
      });
    }, 2000);
  }, [conversationId, currentUser]);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id !== currentUser?.id) setTyping(payload);
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        clearTyping(payload.conversation_id, payload.user_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setShowEmoji(false);
    setText("");
    clearTimeout(typingTimeout.current);
    const result = await sendMessage(conversationId, trimmed);
    if (result.error) {
      toast.error(result.error);
      setText(trimmed);
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function onEmojiClick(emojiData: { emoji: string }) {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      setText(text.slice(0, start) + emojiData.emoji + text.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emojiData.emoji.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setText(text + emojiData.emoji);
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-900 px-3 py-2">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="emoji-picker-wrap absolute bottom-16 left-2 z-50 shadow-2xl rounded-xl overflow-hidden">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={onEmojiClick}
            width={300}
            height={340}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji */}
        <button
          type="button"
          onClick={() => setShowEmoji(v => !v)}
          className={cn(
            "emoji-toggle flex-shrink-0 p-1.5 rounded-full transition-colors mb-0.5",
            showEmoji ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Input */}
        <div className="flex-1 bg-zinc-800 rounded-2xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 resize-none outline-none leading-relaxed"
            style={{ minHeight: "22px", maxHeight: "120px" }}
          />
        </div>

        {/* Attach */}
        <button
          type="button"
          className="flex-shrink-0 p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors mb-0.5"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Send / Mic */}
        {hasText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-all active:scale-95 shadow-md mb-0.5"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" style={{ marginLeft: "1px" }} />
            )}
          </button>
        ) : (
          <button
            type="button"
            className="flex-shrink-0 p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors mb-0.5"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
