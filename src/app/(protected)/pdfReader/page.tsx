"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pdfText, setPdfText] = useState("");

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) return alert("Please select a PDF file");

    setUploading(true);
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (data.text) {
      setPdfText(data.text);
      alert("PDF uploaded and processed!");
    } else {
      alert("Failed to process PDF.");
    }
  };

  // Ask question to AI
  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setAnswer("Thinking...");

    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question }),
    });

    const data = await res.json();
    setAnswer(data.answer || "No answer found.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📖 PadReader RAG</h1>

      {/* File Upload */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <input
          type="file"
          accept="application/pdf"
          className="mb-4 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:rounded-md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleFileUpload}
          disabled={uploading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {/* Question Input */}
      {pdfText && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
          <textarea
            className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white"
            placeholder="Ask a question about the PDF..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            onClick={handleAskQuestion}
            className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Ask Question
          </button>
        </div>
      )}

      {/* Answer Section */}
      {answer && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-xl font-semibold">🤖 Answer:</h2>
          <p className="mt-2 text-gray-300">{answer}</p>
        </div>
      )}
    </div>
  );
}
