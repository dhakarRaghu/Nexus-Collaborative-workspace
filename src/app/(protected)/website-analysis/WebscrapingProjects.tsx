// app/webscraping/WebscrapingProjects.tsx
import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WebscrapingProjects = async () => {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch all projects for the current user.
  const projects = await prisma.webAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 mt-8 text-3xl font-bold">Your Projects</h1>
      {projects.length === 0 ? (
        <p className="text-muted-foreground">No projects found. Start by creating one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="p-4 border">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <p className="text-sm text-muted-foreground">{project.url}</p>
              {/* Use Link for navigation */}
              <Link href={`/website-analysis/${project.id}`}>
                <Button className="mt-4">View Details</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebscrapingProjects;
