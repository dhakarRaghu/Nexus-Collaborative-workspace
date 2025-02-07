"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function WebScraping() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitHandler() {
    try {
      const res = await fetch("/api/projects/webscraping", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Ensure JSON content type
        body: JSON.stringify({ name: projectName, url: url }), // Convert data to JSON
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }
  
      // Redirect to the new project page
      router.push(`/website-analysis/${data.project.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("An error occurred");
    }
  }
  

  return (
    <div className="container mx-auto px-4 py-8">
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
            <Input 
              placeholder="Project Name" 
              className="flex-1"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Input 
                placeholder="https://example.com" 
                className="flex-1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <Button 
                onClick={submitHandler} 
                className="flex items-center gap-2 min-w-[120px]"
                disabled={loading}
              >
                {loading ? "Creating..." : "Analyze"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </div>
      </Card>
      <h1 className="mb-6 mt-8 text-3xl font-bold">All Webpage Details</h1>
      {/* Additional content */}
    </div>
  );
}
