import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { retrieveAnswer } from "@/lib/retrieval";

const ChatRequestSchema = z.object({
  projectId: z.string(),
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(["USER", "SYSTEM"]),
    })
  ),
});

export async function POST(req: Request) {
  try {
    // 1️⃣ Validate request body
    const json = await req.json();
    const parseResult = ChatRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { projectId, messages } = parseResult.data;

    console.log("Project ID:", projectId);
    console.log("Messages:", messages);

    // 2️⃣ Ensure the PDF project exists
    const pdfProjectExists = await prisma.chatPdf.findUnique({
      where: { id: projectId },
    });

    if (!pdfProjectExists) {
      console.error("Invalid projectId: No matching ChatPdf found.");
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    // 3️⃣ Check if chat already exists for this projectPdfId
    let chat = await prisma.chat.findFirst({ where: { projectPdfId: projectId } });

    // 4️⃣ If no chat exists, create one
    if (!chat) {
      try {
        chat = await prisma.chat.create({
          data: {
            projectId: null,
            projectPdfId: projectId,
          },
        });
        console.log("Chat Created:", chat);
      } catch (error) {
        console.error("Chat creation failed:", error);
        return NextResponse.json({ error: "Chat creation failed" }, { status: 500 });
      }
    } else {
      console.log("Existing Chat Found:", chat);
    }

    if (!chat || !chat.id) {
      return NextResponse.json({ error: "Failed to create or retrieve chat entry" }, { status: 500 });
    }

    // 5️⃣ Extract the last user message
    const lastUserMessage = messages[messages.length - 1];
    console.log("Last User Message:", lastUserMessage);

    // 6️⃣ Call Gemini API to generate a response
    const aiMessageContent = await retrieveAnswer(lastUserMessage.content, projectId || "") || "I'm sorry, I don't understand.";
    console.log("AI Message Content:", aiMessageContent);

    // 7️⃣ Save user message to the database
    await prisma.message.create({
      data: {
        chatId: chat.id,
        content: lastUserMessage.content,
        role: "USER",
      },
    });

    // 8️⃣ Save AI's response to the database
    const systemMsg = await prisma.message.create({
      data: {
        chatId: chat.id,
        content: aiMessageContent,
        role: "SYSTEM",
      },
    });

    console.log("System message:", systemMsg);

    // 9️⃣ Return the AI message response in a structured format
    return NextResponse.json({ message: aiMessageContent, role: "SYSTEM" });

  } catch (error: any) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
