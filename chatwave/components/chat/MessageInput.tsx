"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, Send, Paperclip, Mic, X, Trash2 } from "lucide-react";
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

  // ── Voice note state ──
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Voice note recording ──
  function pickMimeType(): { mime: string; ext: string } {
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/mp4")) return { mime: "audio/mp4", ext: "m4a" };
      if (MediaRecorder.isTypeSupported("audio/webm")) return { mime: "audio/webm", ext: "webm" };
    }
    return { mime: "", ext: "webm" };
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime } = pickMimeType();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (!cancelledRef.current) {
          void uploadAndSendAudio();
        }
      };

      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 120) { stopRecording(false); return s; } // 2 min max
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Allow it in browser settings.");
    }
  }

  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  async function uploadAndSendAudio() {
    if (!currentUser) return;
    const { mime, ext } = pickMimeType();
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    if (blob.size < 1000) { toast.error("Recording too short"); return; }

    setUploadingAudio(true);
    try {
      const path = `public/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("voice-notes")
        .upload(path, blob, { contentType: mime || "audio/webm" });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("voice-notes")
        .getPublicUrl(path);

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: "🎤 Voice note",
        audio_url: publicUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send voice note");
    } finally {
      setUploadingAudio(false);
    }
  }

  function formatSecs(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

  // ── Recording UI ──
  if (recording || uploadingAudio) {
    return (
      <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-3">
        <div className="flex items-center gap-3">
          {recording ? (
            <>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="flex-shrink-0 p-2 rounded-full text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-zinc-300 font-medium tabular-nums">
                  {formatSecs(recordSecs)}
                </span>
                <span className="text-xs text-zinc-500">Recording...</span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                <Send className="w-4 h-4 text-white" style={{ marginLeft: "1px" }} />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2 justify-center py-1">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-400">Sending voice note...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            onClick={startRecording}
            className="flex-shrink-0 p-2 rounded-full text-zinc-500 hover:text-blue-400 transition-colors mb-0.5"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
