// components/chat/MessageInput.tsx — Input bar with emoji picker + typing
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { SmilePlus, Send, Loader2 } from "lucide-react";
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

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [text]);

  // Broadcast typing indicator via Supabase Realtime
  const broadcastTyping = useCallback(() => {
    if (!currentUser) return;

    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: currentUser.id,
        username: currentUser.username,
        conversation_id: conversationId,
      },
    });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      supabase.channel(`typing:${conversationId}`).send({
        type: "broadcast",
        event: "stop_typing",
        payload: {
          user_id: currentUser.id,
          conversation_id: conversationId,
        },
      });
    }, 2000);
  }, [conversationId, currentUser]);

  // Subscribe to other user's typing
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id !== currentUser?.id) {
          setTyping(payload);
        }
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
      setText(trimmed); // restore text on error
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
      // Restore focus and cursor position
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
      });
    } else {
      setText(text + emojiData.emoji);
    }
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-20 right-4 z-50 shadow-2xl">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={onEmojiClick}
            width={320}
            height={380}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className={cn(
            "p-2 rounded-xl transition-colors flex-shrink-0 mb-0.5",
            showEmoji
              ? "text-yellow-400 bg-zinc-800"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          <SmilePlus className="w-5 h-5" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              broadcastTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors resize-none leading-relaxed"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={cn(
            "p-2.5 rounded-xl transition-all flex-shrink-0 mb-0.5",
            text.trim() && !sending
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          )}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
        Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono text-zinc-500">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono text-zinc-500">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
