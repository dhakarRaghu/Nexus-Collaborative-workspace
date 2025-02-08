// app/api/chat/route.ts
import { NextResponse } from "next/server";
import  prisma from "@/lib/db";
// import { getContext } from "@/lib/context"; 
import { retrieveAnswer } from "@/lib/retrieval"; // Your Gemini-based retrieval function
import { z } from "zod";

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
    // 1. Parse and validate the request.
    const json = await req.json();
    const parseResult = ChatRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { projectId, messages } = parseResult.data;
    console.log("Project ID", projectId);
    console.log("Messages", messages);

    // // 2. Ensure a chat session exists or create one.
    let chat = await prisma.chat.findFirst({
      where: { projectId },
    });
    console.log("Chat", chat);
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          projectId,
        },
      });
    }
    console.log("Chat", chat);

    // // 3. Retrieve context if needed (e.g., from your webAnalysis or embeddings).
    const lastUserMessage = messages[messages.length - 1];
    console.log("Last User Message", lastUserMessage);
    // const context = await getContext(lastUserMessage.content, projectId);

    // // 4. Call your Gemini-based function to generate the AI response.
    // //    For example, retrieveAnswer might do something like:
    // //      const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    // //      ...
    // //      return geminiAnswer
    const project = await prisma.webAnalysis.findFirst({
      where: { id: projectId },
    });
    const aiMessageContent = await retrieveAnswer(lastUserMessage.content, project?.url || "") || "I'm sorry, I don't understand.";
console.log("AI Message Content", aiMessageContent);
    // if (!aiMessageContent) {
    //   throw new Error("AI did not return a valid response");
    // }

    // // 5. Save the user’s last message in DB (if not already saved).
    await prisma.message.create({
      data: {
        chatId: chat.id,
        content: lastUserMessage.content,
        role: "USER",
      },
    });

    // // 6. Save the AI’s response in DB.
    const systemMsg = await prisma.message.create({
      data: {
        chatId: chat.id,
        content: aiMessageContent,
        role: "SYSTEM",
      },
    });

    // 7. Return the system message to the client.
    console.log("System message:", systemMsg);
    return NextResponse.json(aiMessageContent);

  } catch (error: any) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
