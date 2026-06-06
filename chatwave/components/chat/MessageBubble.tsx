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
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className={cn(
      "flex flex-col",
      isMe ? "items-end" : "items-start",
      isLast ? "mb-2" : "mb-0.5"
    )}>
      <div className="relative group max-w-[78%] md:max-w-[60%]">

        {/* Reaction picker on hover */}
        <div className={cn(
          "absolute -top-8 z-10 flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-zinc-800 border border-zinc-700/50 shadow-lg",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto",
          isMe ? "right-0" : "left-0"
        )}>
          {REACTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setReaction(reaction === r ? null : r)}
              className="text-sm hover:scale-125 transition-transform px-0.5 leading-none"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Bubble */}
        <div className={cn(
          "px-3 py-2 text-sm leading-relaxed break-words",
          isMe
            ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
            : "bg-zinc-800 text-zinc-100 rounded-2xl rounded-bl-md",
          !isLast && isMe && "rounded-br-2xl",
          !isLast && !isMe && "rounded-bl-2xl",
        )}>
          <span>{message.content}</span>

          {/* Inline time + read receipt */}
          <span className={cn(
            "inline-flex items-center gap-0.5 ml-2 float-right mt-1",
            isMe ? "text-blue-200/60" : "text-zinc-500"
          )}>
            <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
            {isMe && (
              message.read_at
                ? <CheckCheck className="w-3 h-3 text-blue-200/70" />
                : <Check className="w-3 h-3 text-blue-300/40" />
            )}
          </span>
        </div>

        {/* Attached reaction */}
        {reaction && (
          <button
            onClick={() => setReaction(null)}
            className={cn(
              "absolute -bottom-3 px-1.5 py-0.5 text-xs rounded-full bg-zinc-800 border border-zinc-700/50 shadow-sm hover:scale-110 transition-transform",
              isMe ? "right-1" : "left-1"
            )}
          >
            {reaction}
          </button>
        )}
      </div>
    </div>
  );
}
