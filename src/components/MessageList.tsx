import { Loader2 } from "lucide-react";
import type { Message } from "@/types/messages";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${
            msg.role === "USER" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`rounded p-2 text-sm ${
              msg.role === "USER" ? "bg-blue-500 text-black" : "bg-gray-300"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {isLoading && messages.length > 0 && (
        <div className="flex justify-start">
          <div className="p-2 text-sm bg-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
