// app/webscraping/ProjectForm.tsx
import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight } from "lucide-react";
import { scrapedContent } from "@/lib/main"; // Your scraping & processing function
import { processTextToEmbeddings } from "@/lib/chunking"; // Function that returns aggregated embedding

// This is a server component.
export default async function ProjectForm() {
  // Get the current session on the server.
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Card className="p-8 border-2 mb-8">
      {/* The form’s action points to the server function "handleSubmit". */}
      <form action={handleSubmit}>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Website Content Analysis</h2>
              <p className="text-muted-foreground">
                Extract valuable insights from any website using our advanced AI analysis tools.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {/* The Input components must have a "name" so their values are available in FormData */}
            <Input name="name" placeholder="Project Name" required />
            <Input name="url" placeholder="https://example.com" required />
            <Button  type="submit" className="flex items-center gap-2 min-w-[120px]">
              Analyze <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

/**
 * Server Action: handleSubmit
 *
 * This function runs on the server when the form is submitted.
 * It checks if the given URL exists in the DB.
 * – If yes, it redirects to its details page.
 * – If not, it scrapes the URL using scrapedContent(), processes the text to get an aggregated embedding,
 *   creates a new project record (storing both the scraped content and embedding), and then redirects.
 */
async function handleSubmit(formData: FormData) {
  "use server";

  // Extract form values.
  const projectName = formData.get("name")?.toString() || "";
  const url = formData.get("url")?.toString() || "";

  // Get the current session.
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  // Check if the URL already exists in the database.
  const existingProject = await prisma.webAnalysis.findFirst({
    where: { url },
  });

  if (existingProject) {
    // If the project exists, immediately redirect to its details page.
    redirect(`/website-analysis/${existingProject.id}`);
  } else {
    // Otherwise, scrape the content from the URL.
    const scraped = await scrapedContent(url);
    if (!scraped) {
      throw new Error("Failed to scrape content");
    }
    // Process the scraped text to generate embeddings.
    const { aggregatedEmbedding } = await processTextToEmbeddings(scraped);
    // Create a new project record in the database.
    const newProject = await prisma.webAnalysis.create({
      data: {
        name: projectName,
        url,
        content: scraped,
        embedding: aggregatedEmbedding, // Store the aggregated embedding (as JSON)
        userId: session.user.id,
      },
    });
    
    // Redirect to the new project's details page.
    redirect(`/website-analysis/${newProject.id}`);
  }
}
