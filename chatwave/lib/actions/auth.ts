// lib/actions/auth.ts — Server Actions for authentication
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Sign up with email + password + phone, then create profile row */
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const full_name = formData.get("full_name") as string;
  const phoneRaw = formData.get("phone") as string;
  const phone = phoneRaw?.trim();

  // Basic validation
  if (!email || !password || !username || !phone) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username must be 3+ chars: lowercase letters, numbers, underscores only." };
  }
  // Phone: digits, optional leading +, 7–15 digits (E.164-ish)
  const phoneClean = phone.replace(/[\s()-]/g, "");
  if (!/^\+?\d{7,15}$/.test(phoneClean)) {
    return { error: "Enter a valid phone number (e.g. +2348012345678)." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name, phone: phoneClean },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed. Try again." };

  revalidatePath("/", "layout");
  redirect("/chat");
}

/** Sign in with email + password */
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/chat");
}

/** Sign out and clear session */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
