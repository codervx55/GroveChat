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
    <div style={{ height: "100dvh", overflow: "hidden" }} className="flex bg-zinc-950">
      {/* Sidebar */}
      <div
        style={{ height: "100dvh" }}
        className={`${isChatOpen ? "hidden md:flex" : "flex"} w-full md:w-80 flex-shrink-0 flex-col bg-zinc-900 border-r border-zinc-800`}
      >
        {sidebar}
      </div>

      {/* Chat area */}
      <main
        style={{ height: "100dvh" }}
        className={`${isChatOpen ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 overflow-hidden`}
      >
        {children}
      </main>
    </div>
  );
}
