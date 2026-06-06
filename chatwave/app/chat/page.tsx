import { MessageSquare } from "lucide-react";

export default function ChatHomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
        <MessageSquare className="w-9 h-9 text-zinc-600" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Your Messages</h2>
      <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
        Select a conversation or search for a user to start chatting.
      </p>
    </div>
  );
}
