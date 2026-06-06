// hooks/useOnlineStatus.ts — Track and broadcast online presence
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Call this once in the chat layout to:
 * - Mark user as online when they enter
 * - Mark user as offline when they leave / tab closes
 */
export function useOnlineStatus() {
  const supabase = createClient();

  useEffect(() => {
    // Set online
    supabase.rpc("set_user_online", { online: true });

    // Set offline on tab close / navigation away
    const handleVisibilityChange = () => {
      supabase.rpc("set_user_online", { online: !document.hidden });
    };

    const handleBeforeUnload = () => {
      supabase.rpc("set_user_online", { online: false });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      supabase.rpc("set_user_online", { online: false });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
