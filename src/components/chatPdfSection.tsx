 "use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Message } from "@/types/messages";

interface ChatPdfSectionProps {
  projectId: string;
}

export default function ChatPdfSection({ projectId }: ChatPdfSectionProps) {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", projectId],
    queryFn: async () => {
      const res = await axios.post<Message[]>("/api/getChat-messages", { projectId });
      return res.data;
    },
  });

  // Handle message submission
  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const fullMessages: Message[] = [...(messages || []), { role: "USER", content: userMessage }];
      const res = await axios.post("/api/chatPdf", {
        projectId,
        messages: fullMessages,
      });
      return res.data; // Should return { message, role }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", projectId] }); // Ensure UI refresh
      setInput("");
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    mutation.mutate(input);
  };

  return (
    <div className="relative max-h-screen overflow-scroll bg-gray-100">
      <div className="sticky top-0 inset-x-0 p-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white font-semibold">
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
