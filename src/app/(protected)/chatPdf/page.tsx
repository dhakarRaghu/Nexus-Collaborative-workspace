// app/ChatPdf/page.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
// import ChatPdfProjects from "./ChatPdfProjects";
import ProjectForm from "../website-analysis/ProjectForm";
import WebscrapingProjects from "../website-analysis/WebscrapingProjects";
import UploadPDF from "./uploadPdf";

export default async function ChatPdfPage() {

  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Document Analysis</h2>
              <p className="text-muted-foreground">
                Upload documents or paste text for instant AI-powered analysis, summaries, and interactive Q&A.
              </p>
         </div>
         <div className="container mx-auto px-4 py-8"></div>
      <UploadPDF></UploadPDF>
    </div>
  );
}
