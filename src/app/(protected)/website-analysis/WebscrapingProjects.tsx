import { redirect } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Globe, ExternalLink } from "lucide-react"
import { GetWebProject } from "@/lib/query"
import { getAuthSession } from "@/lib/auth"

const WebscrapingProjects = async () => {
  const session = await getAuthSession()
  if (!session?.user) {
    redirect("/login")
  }

  // Fetch all projects for the current user.
  const projects = (await GetWebProject()) || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Web Scraping Projects</h1>
      </div>

      {projects.length === 0 ? (
        <Card className="p-6 text-center">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No web scraping projects found. Start by creating one!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex items-center">
                  <Globe className="mr-2 h-4 w-4" />
                  {project.url}
                </p>
              </div>
              <div className="flex space-x-2">
                <Link href={`/website-analysis/${project.id}`} className="flex-1">
                  <Button className="w-full">View Details</Button>
                </Link>
                <Button variant="outline" size="icon" asChild>
                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default WebscrapingProjects

