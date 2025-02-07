// app/webscraping/page.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import WebscrapingProjects from "./WebscrapingProjects";
import ProjectForm from "./ProjectForm";

export default async function WebScrapingPage() {
  // Get the session on the server.
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Render the project creation form (client component) */}
      <ProjectForm />
      {/* Render the list of projects (server component) */}
      <WebscrapingProjects />
    </div>
  );
}
