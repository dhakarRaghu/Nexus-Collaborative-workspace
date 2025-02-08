// components/ChatSection.tsx
"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Message } from "@/types/messages";

interface ChatSectionProps {
  projectId: string; // the project identifier, used to look up/create the chat
}

export default function ChatSection({ projectId }: ChatSectionProps) {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", projectId],
    queryFn: async () => {
      const res = await axios.post<Message[]>("/api/get-messages", { projectId });
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const fullMessages: Message[] = [...(messages || []), { role: "USER", content: userMessage }];
      const res = await axios.post("/api/chat", {
        projectId,
        messages: fullMessages,
      });
      console.log("System message:", res.data);
      return res.data;
    },
    onSuccess: (systemMsg) => {
      queryClient.setQueryData(["chat", projectId], (oldData: Message[] | undefined) => {
        if (!oldData) {
          return [{ role: "USER", content: input }, systemMsg];
        }
        return [...oldData, { role: "USER", content: input }, systemMsg];
      });
      setInput("");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    mutation.mutate(input);
  };

  return (
    <div className="relative max-h-screen overflow-scroll bg-gray-100" id="message-container">
      <div className="sticky top-0 inset-x-0 p-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white font-semibold h-fit rounded-lg">
        <h3 className="text-2xl">Chat with AI</h3>
      </div>

      <MessageList messages={messages || []} isLoading={isLoading || mutation.isPending} />

      <form onSubmit={handleSubmit} className="sticky bottom-0 inset-x-0 px-4 py-4 bg-white border-t-2 border-gray-200">
        <div className="flex gap-4 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-md p-2 text-lg border-2 border-gray-300"
          />
          <Button type="submit" className="bg-blue-600 text-white rounded-full p-3" disabled={mutation.isPending}>
            <Send className="h-6 w-6" />
          </Button>
        </div>
      </form>
    </div>
  );
}
