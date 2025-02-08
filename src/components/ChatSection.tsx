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
  projectId: string;
}

export default function ChatSection({ projectId }: ChatSectionProps) {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  // Fetch existing conversation from /api/get-messages or similar.
  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", projectId],
    queryFn: async () => {
      const res = await axios.post<Message[]>("/api/get-messages", { projectId });
      return res.data;
    },
  });

  // Mutation to send new user message and get AI response.
  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const fullMessages: Message[] = [...(messages || []), { role: "USER", content: userMessage }];
      const res = await axios.post("/api/chat", {
        projectId,
        messages: fullMessages,
      });
      console.log("System message:", res.data);
      return res.data; // This is the system message
    },
    onSuccess: (systemMsg) => {
      // Update the local conversation: append user message & system message
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
    <div className="relative max-h-screen overflow-scroll" id="message-container">
      <div className="sticky top-0 inset-x-0 p-2 bg-white font-bold h-fit">
        <h3 className="text-xl">Chat with AI</h3>
      </div>

      <MessageList messages={messages || []} isLoading={isLoading || mutation.isPending} />

      <form onSubmit={handleSubmit} className="sticky bottom-0 inset-x-0 px-2 py-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
          />
          <Button type="submit" disabled={mutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
