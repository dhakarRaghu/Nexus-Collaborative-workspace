export type Message = {
    id?: number;
    chatId?: number;
    content: string;
    role: "USER" | "SYSTEM";
    createdAt?: string;
  };
  