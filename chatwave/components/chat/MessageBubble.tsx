"use client";

import { useState } from "react";
import { CheckCheck, Check, X } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
import type { Message, Profile } from "@/types";

const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

interface Props {
  message: Message & { image_url?: string };
  isMe: boolean;
  isFirst: boolean;
  isLast: boolean;
  otherUser: Profile | null;
}

export default function MessageBubble({ message, isMe, isFirst, isLast, otherUser }: Props) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  const hasImage = !!message.image_url;
  const textContent = message.content !== "📷 Image" ? message.content : null;

  return (
    <>
      <div className={cn(
        "flex flex-col msg-in",
        isMe ? "items-end" : "items-start",
        isLast ? "mb-2" : "mb-0.5"
      )}>
        <div className="relative group max-w-[78%] md:max-w-[58%]">

          {/* Reaction picker */}
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

          {/* Image only */}
          {hasImage && (
            <button
              onClick={() => setLightbox(true)}
              className={cn(
                "block overflow-hidden mb-0.5",
                textContent ? "rounded-t-2xl" : cn(
                  "rounded-2xl",
                  isMe ? "rounded-br-[4px]" : "rounded-bl-[4px]"
                )
              )}
            >
              <img
                src={message.image_url}
                alt="Image"
                className="max-w-[220px] max-h-[280px] w-auto h-auto object-cover"
              />
            </button>
          )}

          {/* Text bubble */}
          {(textContent || !hasImage) && (
            <div className={cn(
              "relative px-3.5 py-2 text-[14px] leading-relaxed break-words",
              isMe ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-100",
              hasImage ? (isMe ? "rounded-b-2xl rounded-br-[4px]" : "rounded-b-2xl rounded-bl-[4px]") : cn(
                "rounded-2xl",
                isMe && isFirst ? "rounded-tr-[4px]" : "",
                isMe && !isFirst ? "rounded-r-[6px]" : "",
                isMe && isLast ? "rounded-br-[4px]" : "",
                !isMe && isFirst ? "rounded-tl-[4px]" : "",
                !isMe && !isFirst ? "rounded-l-[6px]" : "",
                !isMe && isLast ? "rounded-bl-[4px]" : "",
              )
            )}>
              {textContent}
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
          )}

          {/* Image timestamp overlay */}
          {hasImage && !textContent && (
            <div className={cn(
              "absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/40"
            )}>
              <span className="text-[10px] text-white/80 leading-none">{formatMessageTime(message.created_at)}</span>
              {isMe && (
                message.read_at
                  ? <CheckCheck className="w-2.5 h-2.5 text-white/80" />
                  : <Check className="w-2.5 h-2.5 text-white/50" />
              )}
            </div>
          )}

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

      {/* Lightbox */}
      {lightbox && message.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={message.image_url}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
