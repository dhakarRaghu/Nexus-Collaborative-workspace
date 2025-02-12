import { redirect } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText } from "lucide-react"
import { GetChatProject } from "@/lib/query"
import { getAuthSession } from "@/lib/auth"

const ChatPdfProject = async () => {
  const session = await getAuthSession()
  if (!session?.user) {
    redirect("/login")
  }

  // Fetch all projects for the current user.
  const projects = (await GetChatProject()) || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Projects</h1>
      </div>

      {projects.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">No projects found. Start by creating one!</p>
          <Button asChild>
            <Link href="/new-project">Create Your First Project</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{project.url}</p>
              </div>
              <Link href={`/chatPdf/${project.id}`} className="w-full">
                <Button className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> View Details
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatPdfProject

