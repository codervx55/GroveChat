// lib/utils.ts — Shared utility helpers
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format message timestamp for chat bubbles */
export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "HH:mm");
}

/** Format conversation list timestamp (Today / Yesterday / date) */
export function formatConversationTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yyyy");
}

/** Human-readable "last seen" string */
export function formatLastSeen(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

/** Get initials from a name for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
