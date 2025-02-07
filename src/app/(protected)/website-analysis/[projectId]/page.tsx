import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { AdvancedScraper } from "@/lib/scraping";

type Props = {
  params: { projectId: string };
};

export default async function ProjectDetails({ params }: Props) {
  // Retrieve the current session
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch the project details from the database using the projectId from route parameters
  const project = await prisma.webAnalysis.findUnique({
    where: { id: params.projectId },
  });

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Project Not Found</h1>
      </div>
    );
  }

  // (Optional) Ensure that the project belongs to the current user
  if (project.userId !== session.user.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Unauthorized Access</h1>
      </div>
    );
  }

  // Create an instance of AdvancedScraper to scrape the project's URL
  const scraper = new AdvancedScraper();
  let scrapedContent = "";
  try {
    const result = await scraper.scrape(project.url);
    // Here, result.content is assumed to be the scraped text.
    scrapedContent = result ? result.content : "No content available";
  } catch (error) {
    console.error("Scraping error:", error);
    scrapedContent = "Error occurred while scraping content.";
  } finally {
    await scraper.close();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      <p className="text-sm text-muted-foreground mb-8">URL: {project.url}</p>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Scraped Content</h2>
        <div className="prose">
          {scrapedContent ? (
            <pre>{scrapedContent}</pre>
          ) : (
            <p>No content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
