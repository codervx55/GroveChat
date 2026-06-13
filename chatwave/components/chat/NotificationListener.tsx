// components/chat/NotificationListener.tsx — app-wide new-message notifications
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NotificationListener({
  currentUserId,
  conversationIds,
}: {
  currentUserId: string;
  conversationIds: string[];
}) {
  const supabase = createClient();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === "default") {
      Notification.requestPermission().then(setPermission).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!currentUserId || conversationIds.length === 0) return;

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const msg = payload.new as {
            sender_id: string;
            conversation_id: string;
            content: string;
          };

          if (msg.sender_id === currentUserId) return;
          if (!conversationIds.includes(msg.conversation_id)) return;
          if (pathRef.current === `/chat/${msg.conversation_id}`) return;

          const { data: sender } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", msg.sender_id)
            .single();

          const name = sender?.username || sender?.full_name || "New message";

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const n = new Notification(name, {
                body: msg.content.slice(0, 120),
                icon: "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7212.png",
                tag: msg.conversation_id,
              });
              n.onclick = () => {
                window.focus();
                window.location.href = `/chat/${msg.conversation_id}`;
                n.close();
              };
            } catch {
              // Some mobile browsers throw on direct Notification construction
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, conversationIds.join(",")]);

  return null;
}
