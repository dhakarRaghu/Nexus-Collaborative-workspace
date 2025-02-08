import prisma from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { projectId } = body
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const chat = await prisma.chat.findFirst({
      where: { projectId },
    })
    if (!chat) {
      return NextResponse.json([], { status: 200 })
    }

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
    })
    console.log("Messages fetched for project:", projectId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

