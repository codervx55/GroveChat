// components/auth/SignupForm.tsx — Client signup form
"use client";

import { useState } from "react";
import { signUp } from "@/lib/actions/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);
    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Username</label>
          <input
            name="username"
            type="text"
            required
            placeholder="john_doe"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Min. 6 characters"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Account
        </button>
      </form>
    </div>
  );
}
