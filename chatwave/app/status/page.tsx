"use client";

// app/status/page.tsx — WhatsApp-style Status with custom expiry (24h / 48h / 3 days)

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Trash2, ImageIcon, Loader2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import toast from "react-hot-toast";

type Status = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  bg_color: string | null;
  created_at: string;
  expires_at: string;
  profile?: Profile;
};

type StatusGroup = {
  user: Profile;
  statuses: Status[];
};

const DURATIONS = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "3 days", hours: 72 },
];

const BG_COLORS = ["#0d9488", "#7c3aed", "#be185d", "#b45309", "#1d4ed8", "#18181b"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// Compress image to max 1280px JPEG to save Supabase storage
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      let { width, height } = img;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compress failed"))),
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function StatusPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [caption, setCaption] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Viewer state
  const [viewerGroup, setViewerGroup] = useState<StatusGroup | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatuses = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/auth/login"); return; }

    // Clean up expired statuses (free auto-delete, no cron needed)
    await supabase.rpc("purge_expired_statuses");

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", auth.user.id).single();
    setMe(profile as Profile);

    const { data } = await supabase
      .from("statuses")
      .select("*, profile:profiles(*)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const all = (data ?? []) as Status[];
    const mine = all.filter((s) => s.user_id === auth.user!.id);
    setMyStatuses(mine.reverse());

    const others = all.filter((s) => s.user_id !== auth.user!.id);
    const map = new Map<string, StatusGroup>();
    for (const s of others) {
      if (!s.profile) continue;
      const g = map.get(s.user_id) ?? { user: s.profile, statuses: [] };
      g.statuses.push(s);
      map.set(s.user_id, g);
    }
    map.forEach((g) => g.statuses.reverse());
    setGroups(Array.from(map.values()));
    setLoading(false);
  }, [router]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Images only for now"); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function postStatus() {
    if (!me) return;
    if (!caption.trim() && !imageFile) { toast.error("Add a photo or some text"); return; }
    setPosting(true);
    try {
      const supabase = createClient();
      let mediaUrl: string | null = null;

      if (imageFile) {
        const blob = await compressImage(imageFile);
        const path = `${me.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("status").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("status").getPublicUrl(path);
        mediaUrl = pub.publicUrl;
      }

      const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
      const { error } = await supabase.from("statuses").insert({
        user_id: me.id,
        caption: caption.trim() || null,
        media_url: mediaUrl,
        bg_color: bgColor,
        expires_at: expiresAt,
      });
      if (error) throw error;

      toast.success("Status posted!");
      setShowComposer(false);
      setCaption(""); setImageFile(null); setImagePreview(null);
      setDurationHours(24);
      loadStatuses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  async function deleteStatus(s: Status) {
    const supabase = createClient();
    await supabase.from("statuses").delete().eq("id", s.id);
    if (s.media_url) {
      const path = s.media_url.split("/status/")[1];
      if (path) await supabase.storage.from("status").remove([path]);
    }
    toast.success("Status deleted");
    setViewerGroup(null);
    loadStatuses();
  }

  // ── Viewer logic ──────────────────────────────────────────
  const openViewer = (group: StatusGroup) => {
    setViewerGroup(group);
    setViewerIndex(0);
    setProgress(0);
  };

  useEffect(() => {
    if (!viewerGroup) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (viewerIndex < viewerGroup.statuses.length - 1) {
            setViewerIndex((i) => i + 1);
            return 0;
          } else {
            setViewerGroup(null);
            return 0;
          }
        }
        return p + 2; // 5 seconds per status
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [viewerGroup, viewerIndex]);

  function viewerTap(e: React.MouseEvent<HTMLDivElement>) {
    if (!viewerGroup) return;
    const x = e.clientX;
    const third = window.innerWidth / 3;
    if (x < third) {
      if (viewerIndex > 0) { setViewerIndex(viewerIndex - 1); setProgress(0); }
    } else {
      if (viewerIndex < viewerGroup.statuses.length - 1) {
        setViewerIndex(viewerIndex + 1); setProgress(0);
      } else {
        setViewerGroup(null);
      }
    }
  }

  const current = viewerGroup?.statuses[viewerIndex];

  return (
    <div style={{ height: "100dvh" }} className="flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3 bg-zinc-900 border-b border-zinc-800">
        <button onClick={() => router.push("/chat")} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-white text-lg">Status</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My status row */}
        <button
          onClick={() =>
            myStatuses.length > 0 && me
              ? openViewer({ user: me, statuses: myStatuses })
              : setShowComposer(true)
          }
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-900 transition-colors"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-zinc-700 ${myStatuses.length > 0 ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-zinc-950" : ""}`}>
              {me?.avatar_url
                ? <img src={me.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : getInitials(me?.username ?? "Me")}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center border-2 border-zinc-950">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-medium">My Status</p>
            <p className="text-zinc-500 text-sm">
              {myStatuses.length > 0
                ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""} • tap to view`
                : "Tap to add status update"}
            </p>
          </div>
          {myStatuses.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); setShowComposer(true); }}
              className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-teal-400"
            >
              <Plus className="w-4 h-4" />
            </span>
          )}
        </button>

        <p className="px-4 pt-4 pb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Recent updates
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-8 text-center text-zinc-600 text-sm">
            No status updates from others yet
          </p>
        ) : (
          groups.map((g) => (
            <button
              key={g.user.id}
              onClick={() => openViewer(g)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold bg-zinc-700 ring-2 ring-teal-500 ring-offset-2 ring-offset-zinc-950">
                {g.user.avatar_url
                  ? <img src={g.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : getInitials(g.user.username)}
              </div>
              <div className="text-left">
                <p className="text-white font-medium">{g.user.full_name || g.user.username}</p>
                <p className="text-zinc-500 text-sm">{timeAgo(g.statuses[g.statuses.length - 1].created_at)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── COMPOSER MODAL ── */}
      {showComposer && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col" style={{ height: "100dvh" }}>
          <div className="px-4 pt-12 pb-4 flex items-center justify-between">
            <button onClick={() => setShowComposer(false)} className="text-zinc-400">
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-semibold">New Status</span>
            <div className="w-6" />
          </div>

          <div
            className="flex-1 flex flex-col items-center justify-center px-6 transition-colors"
            style={{ backgroundColor: imagePreview ? "#000" : bgColor }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="" className="max-h-[50dvh] rounded-xl object-contain" />
            ) : null}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={imagePreview ? "Add a caption..." : "Type a status..."}
              maxLength={500}
              rows={imagePreview ? 2 : 4}
              className="w-full mt-4 bg-transparent text-white text-center text-xl font-medium placeholder-white/50 outline-none resize-none"
            />
          </div>

          <div className="p-4 space-y-4 bg-zinc-900">
            {!imagePreview && (
              <div className="flex gap-2 justify-center">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-8 h-8 rounded-full ${bgColor === c ? "ring-2 ring-white" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-500 text-sm mr-1">Disappears after:</span>
              {DURATIONS.map((d) => (
                <button
                  key={d.hours}
                  onClick={() => setDurationHours(d.hours)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    durationHours === d.hours
                      ? "bg-teal-500 text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                {imagePreview ? "Change photo" : "Add photo"}
              </button>
              <button
                onClick={postStatus}
                disabled={posting}
                className="flex-1 py-3 rounded-xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN VIEWER ── */}
      {viewerGroup && current && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ height: "100dvh", backgroundColor: current.media_url ? "#000" : (current.bg_color ?? "#18181b") }}
          onClick={viewerTap}
        >
          {/* Progress bars */}
          <div className="flex gap-1 px-3 pt-12">
            {viewerGroup.statuses.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: i < viewerIndex ? "100%" : i === viewerIndex ? `${progress}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold">
              {viewerGroup.user.avatar_url
                ? <img src={viewerGroup.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : getInitials(viewerGroup.user.username)}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">
                {viewerGroup.user.id === me?.id ? "My Status" : (viewerGroup.user.full_name || viewerGroup.user.username)}
              </p>
              <p className="text-white/60 text-xs">{timeAgo(current.created_at)}</p>
            </div>
            {viewerGroup.user.id === me?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteStatus(current); }}
                className="text-white/70 p-2"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setViewerGroup(null); }}
              className="text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
            {current.media_url && (
              <img src={current.media_url} alt="" className="max-h-[60dvh] max-w-full object-contain rounded-lg" />
            )}
            {current.caption && (
              <p className={`text-white text-center font-medium mt-4 ${current.media_url ? "text-base" : "text-2xl"}`}>
                {current.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

