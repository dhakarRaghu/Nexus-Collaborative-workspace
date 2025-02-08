import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import Link from "next/link";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetails(props: Props) {
  // Get the projectId from the route params.
  const { projectId } = await props.params;
  console.log("projectId", projectId);

  // Retrieve the current session.
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch the project details from the database.
  const project = await prisma.webAnalysis.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Project Not Found</h1>
      </div>
    );
  }

  // (Optional) Ensure that the project belongs to the current user.
  if (project.userId !== session.user.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Unauthorized Access</h1>
      </div>
    );
  }

  // Use the stored scraped content.
  const scrapedtext = project.content;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      <Link href={project.url} target="_blank" rel="noopener noreferrer">
      <div>
        url  : <p className="text-sm text-blue-500 underline mb-8"> {project.url}</p>
      </div>
      URL:
      </Link>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Scraped Content</h2>
        <div 
          className="prose" 
          style={{ whiteSpace: "pre-wrap" }} // Preserve line breaks and whitespace
        >
          {scrapedtext ? scrapedtext : <p>No content available.</p>}
        </div>
      </div>
      
    </div>
  );
}
