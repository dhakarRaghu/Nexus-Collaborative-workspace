"use client";

import { Github, Globe, FileText, ArrowRight, Sparkles, Code2, Braces, Bot, Video, MessageSquare, FileSearch, ChevronRight, Star, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";


export default function Home() {

  const [activeTab, setActiveTab] = useState("github");

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Main Features Section */}
      <div className="container mx-auto px-4 pb-20 mt-10">
        <Tabs defaultValue="github" className="w-full max-w-7xl max-h-8xl mx-auto" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-8">
            <TabsTrigger value="github" className="flex items-center gap-2 h-14">
              <Github className="h-4 w-4" />
              GitHub Analysis
            </TabsTrigger>
            <TabsTrigger value="website" className="flex items-center gap-2 h-14">
              <Globe className="h-4 w-4" />
              Website Analysis
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2 h-14">
              <FileText className="h-4 w-4" />
              Document Analysis
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-8">
            <TabsContent value="github">
              <Card className="p-10 border-2">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Github className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">GitHub Repository Analysis</h2>
                      <p className="text-muted-foreground">
                        Get instant insights into any GitHub repository. Analyze code patterns, dependencies, and collaboration opportunities.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="project name" 
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://github.com/username/repository" 
                        className="flex-1"
                      />
                    </div>
                    <Button className="flex items-center gap-2 min-w-[120px]">
                        Analyze <ArrowRight className="h-4 w-4" />
                      </Button>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4 bg-muted/50">
                        <Braces className="h-5 w-5 text-primary mb-2" />
                        <h3 className="font-medium">Code Analysis</h3>
                        <p className="text-sm text-muted-foreground">Pattern detection & quality metrics</p>
                      </Card>
                      <Card className="p-4 bg-muted/50">
                        <Bot className="h-5 w-5 text-primary mb-2" />
                        <h3 className="font-medium">AI Insights</h3>
                        <p className="text-sm text-muted-foreground">Smart recommendations</p>
                      </Card>
                      <Card className="p-4 bg-muted/50">
                        <MessageSquare className="h-5 w-5 text-primary mb-2" />
                        <h3 className="font-medium">Collaboration</h3>
                        <p className="text-sm text-muted-foreground">Team communication</p>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="website">
              <Card className="p-8 border-2">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">Website Content Analysis</h2>
                      <p className="text-muted-foreground">
                        Extract valuable insights from any website using our advanced RAG system and AI analysis tools.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://example.com" 
                        className="flex-1"
                      />
                        <Link href={`/website-analysis`}>
                        <Button className="flex items-center gap-2 min-w-[120px]">
                          Analyze <ArrowRight className="h-4 w-4" />
                        </Button>
                        </Link>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">AI Analysis</Badge>
                          <span className="text-sm text-muted-foreground">Results </span>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="document">
              <Card className="p-8 border-2 shadow-lg">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSearch className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">Document Analysis</h2>
                      <p className="text-muted-foreground">
                        Upload documents or paste text for instant AI-powered analysis, summaries, and interactive Q&A.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="flex gap-2">
                      <Input type="file" className="flex-1" />
                      <Button className="flex items-center gap-2 min-w-[120px]">
                        Upload <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-center items-center font-extrabold">OR</div>
                    <div className="relative">
                      <ScrollArea className="h-[200px] border rounded-lg p-4">
                        <textarea
                          placeholder="Paste your text here for analysis..."
                          className="w-full h-full min-h-[180px] resize-none border-none focus:outline-none focus:ring-0"
                        />
                      </ScrollArea>
                    </div>
                    <Button className="w-full">Analyze Text</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Recent Projects Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Recent Projects</h2>
            <p className="text-muted-foreground">Continue working on your active projects</p>
          </div>
          <Button variant="outline" className="gap-2">
            View All Projects <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "E-Commerce Platform",
              description: "Building a modern e-commerce solution with AI-powered recommendations",
              teams: 3,
              status: "active"
            },
            {
              name: "Mobile App Development",
              description: "Cross-platform mobile application for fitness tracking",
              teams: 2,
              status: "active"
            },
            {
              name: "Start New Project",
              description: "Create a new workspace for your team",
              isNew: true
            }
          ].map((project, i) => (
            <Card
              key={i}
              className={`p-6 ${project.isNew ? 'border-dashed' : ''} hover:shadow-lg transition-shadow`}
            >
              {project.isNew ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                  <p className="text-muted-foreground mb-4">{project.description}</p>
                  <Button variant="outline">Create Project</Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                      <p className="text-muted-foreground">{project.description}</p>
                    </div>
                    <Badge variant="secondary">{project.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{project.teams} teams</span>
                    </div>
                    <Button variant="ghost" className="gap-2">
                      Open <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}