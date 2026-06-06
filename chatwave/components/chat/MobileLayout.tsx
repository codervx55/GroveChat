"use client";

import { usePathname } from "next/navigation";
import React from "react";

interface MobileLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MobileLayout({ sidebar, children }: MobileLayoutProps) {
  const pathname = usePathname();
  const isChatOpen = pathname !== "/chat" && pathname.startsWith("/chat/");

  return (
    <div className="flex h-screen h-[100dvh] bg-zinc-950 overflow-hidden">
      {/* Sidebar — hidden on mobile when a chat is open */}
      <div
        className={`w-full md:w-80 md:flex-shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 h-full ${
          isChatOpen ? "hidden md:flex" : "flex"
        }`}
      >
        {sidebar}
      </div>
      {/* Chat area — full screen on mobile, hidden when no chat selected */}
      <main
        className={`flex-1 flex-col min-w-0 ${
          isChatOpen ? "flex" : "hidden md:flex"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
