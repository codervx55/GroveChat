"use client";

import { useState } from "react";
import { CheckCheck, Check } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
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
  const [reaction, setReaction] = useState<string | null>(null);

  return (
    <div className={cn(
      "flex flex-col msg-in",
      isMe ? "items-end" : "items-start",
      isLast ? "mb-2" : "mb-[2px]"
    )}>
      <div className="relative group max-w-[78%] md:max-w-[58%]">

        {/* Reaction picker — shows on hover */}
        <div className={cn(
          "absolute -top-9 z-20 flex items-center gap-0.5 px-2 py-1.5 rounded-full",
          "bg-zinc-800 border border-zinc-700/50 shadow-xl",
          "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100",
          "transition-all duration-150 pointer-events-none group-hover:pointer-events-auto",
          isMe ? "right-0" : "left-0"
        )}>
          {REACTIONS.map(r => (
            <button key={r} onClick={() => setReaction(reaction === r ? null : r)}
              className="text-base hover:scale-125 transition-transform leading-none px-0.5">
              {r}
            </button>
          ))}
        </div>

        {/* Bubble */}
        <div className={cn(
          "relative px-3.5 py-2 text-[14px] leading-relaxed break-words",
          isMe
            ? "bg-blue-500 text-white"
            : "bg-zinc-800 text-zinc-100",
          // Rounded corners — Telegram style
          isMe && isFirst && isLast && "rounded-2xl rounded-br-[4px]",
          isMe && isFirst && !isLast && "rounded-2xl rounded-br-[4px]",
          isMe && !isFirst && isLast && "rounded-2xl rounded-tr-[6px] rounded-br-[4px]",
          isMe && !isFirst && !isLast && "rounded-2xl rounded-r-[6px]",
          !isMe && isFirst && isLast && "rounded-2xl rounded-bl-[4px]",
          !isMe && isFirst && !isLast && "rounded-2xl rounded-bl-[4px]",
          !isMe && !isFirst && isLast && "rounded-2xl rounded-tl-[6px] rounded-bl-[4px]",
          !isMe && !isFirst && !isLast && "rounded-2xl rounded-l-[6px]",
        )}>
          {message.content}

          {/* Timestamp + receipt inline at end */}
          <span className={cn(
            "inline-flex items-center gap-0.5 ml-2 float-right translate-y-[3px]",
            isMe ? "text-blue-200/60" : "text-zinc-500"
          )}>
            <span className="text-[10px] leading-none">{formatMessageTime(message.created_at)}</span>
            {isMe && (
              message.read_at
                ? <CheckCheck className="w-3 h-3 text-blue-200/80" />
                : <Check className="w-3 h-3 text-blue-200/40" />
            )}
          </span>
        </div>

        {/* Reaction badge */}
        {reaction && (
          <button
            onClick={() => setReaction(null)}
            className={cn(
              "absolute -bottom-3 px-1.5 py-0.5 text-xs rounded-full",
              "bg-zinc-800 border border-zinc-700 shadow-sm",
              "hover:scale-110 transition-transform",
              isMe ? "right-2" : "left-2"
            )}
          >
            {reaction}
          </button>
        )}
      </div>
    </div>
  );
}
