import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // ✅ Ensure the request is a POST request
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
    }
    console.log(req);
    const body = await req.json();
    if (!body || !body.name || !body.url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getAuthSession();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const project = await prisma.webAnalysis.create({
      data: {
        name: body.name,
        url: body.url,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
