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
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const supabase = createClient();
  const { setTyping, clearTyping } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  // Close emoji picker on outside click
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

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setShowEmoji(false);
    setText("");
    clearTimeout(typingTimeout.current);
    const res = await sendMessage(conversationId, t);
    if (res.error) { toast.error(res.error); setText(t); }
    setSending(false);
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

  const hasText = text.trim().length > 0;

  return (
    <div className="relative px-3 py-2 bg-zinc-900 border-t border-zinc-800">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="emoji-wrap absolute bottom-full left-2 mb-2 z-50 rounded-xl overflow-hidden shadow-2xl">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={pickEmoji}
            width={300}
            height={340}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji toggle */}
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

        {/* Text input */}
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

        {/* Attach */}
        <button
          type="button"
          className="flex-shrink-0 p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors mb-0.5"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Send or Mic */}
        {hasText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-500/20 mb-0.5"
          >
            {sending
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
