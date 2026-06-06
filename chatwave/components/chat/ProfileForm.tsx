// components/chat/ProfileForm.tsx — Profile editing form
"use client";

import { useState, useRef } from "react";
import { updateProfile, uploadAvatar } from "@/lib/actions/chat";
import { Avatar } from "./Sidebar";
import { Camera, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
  userEmail: string;
}

export default function ProfileForm({ profile, userEmail }: Props) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const result = await uploadAvatar(fd);
    if (result.error) {
      toast.error(result.error);
    } else {
      setAvatarUrl(result.url ?? null);
      toast.success("Avatar updated!");
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateProfile(fd);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile saved!");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              profile={avatarUrl ? { ...profile!, avatar_url: avatarUrl } : profile}
              size="lg"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center border-2 border-zinc-900 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-white" />
              )}
            </button>
          </div>
          <div>
            <p className="text-white font-medium">{profile?.username}</p>
            <p className="text-zinc-500 text-sm">{userEmail}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-blue-400 hover:text-blue-300 text-sm mt-1 transition-colors"
            >
              Change photo
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Info section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Info</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Username *</label>
              <input
                name="username"
                defaultValue={profile?.username ?? ""}
                required
                placeholder="username"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
              <input
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="John Doe"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              placeholder="Tell people a bit about yourself..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Email (read-only) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Account</h2>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
          <input
            value={userEmail}
            readOnly
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-600 mt-1">Email cannot be changed here.</p>
        </div>
      </div>
    </div>
  );
}
