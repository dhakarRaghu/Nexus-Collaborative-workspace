import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { AdvancedScraper } from "@/lib/scraping";

export async function POST(req: NextRequest) {
  try {
    // console.log("Incoming request method:", req.method);

    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    const body = await req.json();
    // console.log("Received body:", body);

    if (!body || !body.name || !body.url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getAuthSession();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ✅ Create a project entry in the database
    const project = await prisma.webAnalysis.create({
      data: {
        name: body.name,
        url: body.url,
        userId: session.user.id,
      },
    });

    // ✅ Scrape the URL and store result
    let scrapingResult = null;
    const scraper = new AdvancedScraper();

    try {
        console.log("Scraping URL:", body.url , encodeURIComponent(body.url));
      scrapingResult = await scraper.scrape(body.url);
    } catch (scrapingError) {
      console.error("Scraping error:", scrapingError);
    } finally {
      await scraper.close();
    }

    // ✅ Return project and scraping results together
    return NextResponse.json(
      {
        project,
        scrapingResult: scrapingResult || { error: "Failed to scrape content" },
      },
      { status: scrapingResult ? 200 : 500 }
    );

  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
