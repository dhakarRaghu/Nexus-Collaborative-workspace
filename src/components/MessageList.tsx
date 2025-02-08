// components/MessageList.tsx
import React from "react";
import { Message } from "@/types/messages";
import { cn } from "@/lib/utils"; // Assume a utility function to merge classNames
import { Loader2 } from "lucide-react";

interface Props {
  messages: Message[];
  isLoading: boolean;
}

const MessageList = ({ messages, isLoading }: Props) => {
  if (isLoading && messages.length === 0) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn("flex", {
            "justify-end pl-10": message.role === "USER",
            "justify-start pr-10": message.role === "SYSTEM",
          })}
        >
          <div
            className={cn("rounded-lg px-3 py-2 text-sm shadow-md ring-1 ring-black-900/10", {
              "bg-blue-500 text-white": message.role === "USER",
              "bg-gray-300 text-black": message.role === "SYSTEM",
            })}
          >
            {message.content}
          </div>
        </div>
      ))}
      {isLoading && messages.length > 0 && (
        <div className="flex justify-start pr-10">
          <div className="rounded-lg px-3 py-1 shadow-md ring-1 ring-gray-900/10">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
