"use client";

import { usePathname } from "next/navigation";

export default function MobileLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatOpen = pathname.startsWith("/chat/") && pathname !== "/chat/";

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Sidebar — hidden on mobile when chat is open */}
      <div className={`${isChatOpen ? "hidden md:flex" : "flex"} w-full md:w-80 flex-shrink-0 flex-col bg-zinc-900 border-r border-white/[0.06] h-full`}>
        {sidebar}
      </div>
      {/* Chat area — hidden on mobile when no chat open */}
      <main className={`${isChatOpen ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {children}
      </main>
    </div>
  );
}
