"use client";

import { useState } from "react";
import { CheckCheck, Check } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
import { Avatar } from "./Sidebar";
import type { Message, Profile } from "@/types";

const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

interface Props {
  message: Message;
  isMe: boolean;
  isFirst: boolean;
  isLast: boolean;
  otherUser: Profile | null;
}

export default function MessageBubble({ message, isMe, isFirst, isLast, otherUser }: Props) {
  const [showReactions, setShowReactions] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const bubbleRadius = isMe
    ? cn("rounded-2xl", isFirst ? "rounded-tr-sm" : "", isLast ? "rounded-br-sm" : "")
    : cn("rounded-2xl", isFirst ? "rounded-tl-sm" : "", isLast ? "rounded-bl-sm" : "");

  return (
    <div
      className={cn(
        "flex items-end gap-2 msg-enter group",
        isMe ? "justify-end" : "justify-start",
        isLast ? "mb-3" : "mb-0.5"
      )}
    >
      {/* Avatar for received messages */}
      {!isMe && (
        <div className="w-7 flex-shrink-0 mb-0.5">
          {isLast && <Avatar profile={otherUser} size="sm" />}
        </div>
      )}

      <div className={cn("flex flex-col max-w-[72%] md:max-w-[60%]", isMe ? "items-end" : "items-start")}>
        {/* Reaction bar */}
        <div
          className={cn(
            "flex items-center gap-1 mb-1.5 px-2 py-1 glass rounded-full",
            "opacity-0 group-hover:opacity-100 transition-all duration-200",
            isMe ? "self-end" : "self-start"
          )}
        >
          {REACTIONS.map((r) => (
            <button
              key={r}
              onClick={() => { setReaction(reaction === r ? null : r); setShowReactions(false); }}
              className="text-base hover:scale-125 transition-transform leading-none"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5 msg-bubble",
            bubbleRadius,
            isMe
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "glass text-zinc-100 shadow-sm"
          )}
        >
          <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Time + read receipt */}
          <div className={cn(
            "flex items-center gap-1 mt-1",
            isMe ? "justify-end" : "justify-start"
          )}>
            <span className={cn(
              "text-[10px] font-medium",
              isMe ? "text-blue-200/70" : "text-zinc-500"
            )}>
              {formatMessageTime(message.created_at)}
            </span>
            {isMe && (
              message.read_at
                ? <CheckCheck className="w-3 h-3 text-blue-200" />
                : <Check className="w-3 h-3 text-blue-300/50" />
            )}
          </div>
        </div>

        {/* Reaction display */}
        {reaction && (
          <button
            onClick={() => setReaction(null)}
            className="mt-1 px-2 py-0.5 glass rounded-full text-sm hover:scale-110 transition-transform"
          >
            {reaction} <span className="text-[10px] text-zinc-500 ml-0.5">1</span>
          </button>
        )}
      </div>

      {/* Spacer for sent messages */}
      {isMe && <div className="w-2 flex-shrink-0" />}
    </div>
  );
}
