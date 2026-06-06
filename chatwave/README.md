# 🌊 GroveChat — Real-time Chat App

A production-ready real-time messaging app built with **Next.js 15**, **Supabase**, **TypeScript**, and **Tailwind CSS**.

---

## ✨ Features

- 🔐 Email/password + Google OAuth authentication
- 💬 Real-time one-on-one messaging (Supabase Realtime)
- ⌨️ Typing indicators (broadcast channels)
- ✅ Read receipts (double checkmarks)
- 🟢 Online/offline presence
- 😊 Emoji picker
- 📸 Avatar upload
- 👤 Profile editing (username, bio, full name)
- 🔍 User search
- 📱 Fully responsive (mobile + desktop)
- 🌙 Dark mode by default
- 🔒 Route protection via middleware
- 🛡️ Row Level Security on all tables

---

## 🗂️ Project Structure

```
grovechat/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   └── callback/route.ts     # OAuth callback
│   ├── chat/
│   │   ├── layout.tsx            # Chat shell + sidebar
│   │   ├── page.tsx              # Empty state
│   │   └── [id]/page.tsx         # Conversation page
│   ├── profile/page.tsx          # Profile editor
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root redirect
│   └── globals.css               # Global styles
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   └── chat/
│       ├── Sidebar.tsx           # Left sidebar + Avatar
│       ├── ChatWindow.tsx        # Chat area + realtime
│       ├── MessageBubble.tsx     # Single message
│       ├── MessageInput.tsx      # Input + emoji picker
│       └── ProfileForm.tsx       # Profile edit form
├── hooks/
│   └── useOnlineStatus.ts        # Online presence hook
├── lib/
│   ├── actions/
│   │   ├── auth.ts               # Auth server actions
│   │   └── chat.ts               # Chat server actions
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── store.ts                  # Zustand global state
│   └── utils.ts                  # Helpers
├── types/index.ts                # TypeScript types
├── middleware.ts                 # Route protection
├── supabase-schema.sql           # ← Run this in Supabase!
└── .env.example                  # Environment template
```

---

## 🚀 Setup Guide

### Step 1 — Clone & Install

```bash
git clone <your-repo-url> grovechat
cd grovechat
npm install
```

### Step 2 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL** and **anon/public key** from:
   - Dashboard → Project Settings → API

### Step 3 — Run the Database Schema

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and click **Run**

This creates:
- `profiles` table with auto-creation trigger
- `conversations` + `conversation_participants` tables
- `messages` table with indexes
- All Row Level Security policies
- Realtime subscriptions
- Storage bucket for avatars
- Online status RPC function

### Step 4 — Enable Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → Providers → Google → paste Client ID & Secret

### Step 5 — Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 6 — Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Your app's public URL (no trailing slash) |

---

## 🚢 Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Set the same environment variables in your Vercel project settings. Update `NEXT_PUBLIC_SITE_URL` to your production domain.

Also update in Supabase → Authentication → URL Configuration:
- **Site URL**: your production URL
- **Redirect URLs**: `https://yourdomain.com/auth/callback`

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend/DB | Supabase (Postgres) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| State | Zustand |
| Emoji | emoji-picker-react |
| Toasts | react-hot-toast |
| Icons | lucide-react |
