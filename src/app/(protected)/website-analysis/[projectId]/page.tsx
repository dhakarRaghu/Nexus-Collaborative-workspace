// app/website-analysis/[projectId]/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import Link from "next/link";
import ChatSection from "@/components/ChatSection"; // A client component for chat interactivity

interface Props {
  params: Promise<{  projectId: string}>;
}

export default async function ProjectDetails( props : Props) {
  // Destructure params (no need to await because params is an object here)
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

  // (Optional) Check that the project belongs to the user.
  if (project.userId !== session.user.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Unauthorized Access</h1>
      </div>
    );
  }

  // Use the stored scraped content.
  const scrapedContent = project.content;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      <Link href={project.url} target="_blank" rel="noopener noreferrer">
        <div>
          URL:{" "}
          <p className="text-sm text-blue-500 underline mb-8">
            {project.url}
          </p>
        </div>
      </Link>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Scraped Content</h2>
        <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
          {scrapedContent ? scrapedContent : <p>No content available.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Chat Section</h2>
        {/* Pass the project URL as a prop to the chat component (e.g. as namespace) */}
        <ChatSection  projectId={projectId} />
      </div>
    </div>
  );
}
