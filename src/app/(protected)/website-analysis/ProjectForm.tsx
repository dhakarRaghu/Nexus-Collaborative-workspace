// app/webscraping/ProjectForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight } from "lucide-react";

export default function ProjectForm() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects/webscraping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }
      // Redirect to the project details page after creation.
      router.push(`/website-analysis/${data.project.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("An error occurred");
    }
    setLoading(false);
  }

  return (
    <Card className="p-8 border-2 mb-8">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">Website Content Analysis</h2>
            <p className="text-muted-foreground">
              Extract valuable insights from any website using our advanced AI analysis tools.
            </p>
          </div>
        </div>
        <form onSubmit={submitHandler} className="space-y-4">
          <Input
            name="name"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Input
              name="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="flex items-center gap-2 min-w-[120px]">
              {loading ? "Creating..." : "Analyze"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-red-500">{error}</p>}
        </form>
      </div>
    </Card>
  );
}
