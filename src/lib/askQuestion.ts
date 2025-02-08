import  prisma  from "@/lib/db";
import { retrieveAnswer } from "@/lib/retrieval";

// Function to create a new chat session for a given project and then save a message.
export async function createChatAndSaveMessageByUser(
  projectId: string,
  role: "USER",
  content: string
) {
    console.log("Project ID", projectId);
    console.log("Role", content);
    const existingChat = await prisma.chat.findFirst({
        where: { projectId: projectId },
      });
      

      if(!existingChat){
            const chat = await prisma.chat.create({
                data: {
                projectId, // Link the chat to the project
                },
            });
            const message = await prisma.message.create({
                data: {
                  chatId: chat.id,
                  content,
                  role, // Either "USER" 
                },
              });
        }

        if(existingChat){
            const message = await prisma.message.create({
                data: {
                  chatId: existingChat.id,
                  content,
                  role, // Either "USER" or "SYSTEM"
                },
              });
        }
        console.log("Message saved:", content);

}
export async function SaveMessageByAI(
  projectId: string,
  role: "SYSTEM",
  content: string
) {
    const existingChat = await prisma.chat.findFirst({
        where: { projectId: projectId },
      });
      
      const ans = "I'm sorry, I don't understand.";
        console.log("Answer", ans);

        if(existingChat){
            const message = await prisma.message.create({
                data: {
                  chatId: existingChat.id,
                   content:ans ,
                  role, 
                },
              });
        }
        else{
            console.log("Chat not found");
        }

}
