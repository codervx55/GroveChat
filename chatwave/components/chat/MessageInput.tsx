"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { SmilePlus, Send, Paperclip, Mic, X } from "lucide-react";
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

  // Auto-resize
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 140) + "px";
    }
  }, [text]);

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".emoji-container") && !target.closest(".emoji-btn")) {
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

  // Subscribe to typing
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
      const newText = text.slice(0, start) + emojiData.emoji + text.slice(end);
      setText(newText);
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
    <div className="px-3 pb-4 pt-2">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="emoji-container absolute bottom-24 left-3 z-50 shadow-2xl rounded-2xl overflow-hidden">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={onEmojiClick}
            width={300}
            height={360}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input container */}
      <div className={cn(
        "flex items-end gap-2 glass rounded-2xl px-3 py-2 transition-all duration-200 input-glow",
        "border border-white/[0.06] hover:border-white/10"
      )}>
        {/* Left actions */}
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            className={cn(
              "emoji-btn p-1.5 rounded-xl transition-all",
              showEmoji
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            {showEmoji ? <X className="w-4 h-4" /> : <SmilePlus className="w-4 h-4" />}
          </button>
          <button
            type="button"
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-transparent text-[14.5px] text-white placeholder:text-zinc-600 resize-none outline-none leading-relaxed py-1.5"
          style={{ minHeight: "36px", maxHeight: "140px" }}
        />

        {/* Right actions */}
        <div className="flex items-center gap-1 pb-1">
          {!hasText && (
            <button
              type="button"
              className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasText || sending}
            className={cn(
              "p-2 rounded-xl transition-all duration-200",
              hasText && !sending
                ? "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 scale-100 hover:scale-105 active:scale-95"
                : "text-zinc-600 cursor-not-allowed"
            )}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" style={{ marginLeft: '1px' }} />
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-zinc-700 mt-1.5">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
