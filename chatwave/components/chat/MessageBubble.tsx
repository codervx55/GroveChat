// components/chat/MessageBubble.tsx — Single message bubble
import { CheckCheck, Check } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
import { Avatar } from "./Sidebar";
import type { Message, Profile } from "@/types";

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  otherUser: Profile | null;
}

export default function MessageBubble({ message, isMe, showAvatar, otherUser }: Props) {
  return (
    <div className={cn("flex items-end gap-2 bubble-enter", isMe ? "justify-end" : "justify-start")}>
      {/* Avatar placeholder for alignment */}
      {!isMe && (
        <div className="w-7 flex-shrink-0">
          {showAvatar && <Avatar profile={otherUser} size="sm" />}
        </div>
      )}

      <div
        className={cn(
          "max-w-[70%] md:max-w-[55%] rounded-2xl px-3.5 py-2",
          isMe
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
        )}
      >
        {/* Message text */}
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Time + read receipt */}
        <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
          <span className={cn("text-[10px]", isMe ? "text-blue-200" : "text-zinc-500")}>
            {formatMessageTime(message.created_at)}
          </span>

          {/* Read receipt — only show for sent messages */}
          {isMe && (
            message.read_at ? (
              <CheckCheck className="w-3 h-3 text-blue-200" />
            ) : (
              <Check className="w-3 h-3 text-blue-300/60" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
