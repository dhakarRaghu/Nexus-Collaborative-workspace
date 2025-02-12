"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { uploadPDF } from "@/lib/pdf-process";
import { useRouter } from "next/navigation";  

export default function UploadPDF() {
  const router = useRouter(); 
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ text?: string; fileUrl?: string } | null>(null);
  const [Id , setId ] = useState<string | null>(null);

  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB max
  const ALLOWED_FORMATS = ["application/pdf"]; // Only allow PDFs

  // Drag & Drop Handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files.length > 0) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 4MB limit.");
      return;
    }
    if (!ALLOWED_FORMATS.includes(selectedFile.type)) {
      toast.error("Only PDF files are allowed.");
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
  };

  const handleUpload = async (selectedFile: File) => {
    try {
      setUploading(true);
      const response = await uploadPDF(selectedFile);
      if (response.error) {
        throw new Error(response.error);
      }

      setUploadedFile(response);
      setFile(null);
      setFileName(null);
      setError(null);
      toast.success("File uploaded successfully");
      const projectId = response.chat_id
      setId(projectId);
      if (projectId) {
          router.push(`/chatPdf/${projectId}`);
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {/* Drop Zone */}
      <div
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
        ${dragActive ? "border-blue-600 bg-blue-100" : "border-gray-300"}`}
        onClick={() => inputFileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-gray-600">
          {dragActive ? "Drop the file here..." : "Drag & Drop your file here or Click to upload"}
        </p>
        <Button type="button" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
          Select File
        </Button>
      </div>

      {/* Hidden Input Field */}
      <input
        ref={inputFileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
      />

      {/* Selected File Name */}
      {fileName && <p className="text-gray-700 text-sm mt-2">Selected: {fileName}</p>}

      {/* Error Message */}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* Upload Button */}
      <Button
        type="button"
        disabled={uploading}
        className={`w-full mt-4 px-4 py-2 text-white rounded-lg transition duration-200 ${
          uploading ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
        }`}
        onClick={() => file && handleUpload(file)}
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button>

      {/* Uploaded File Info */}
      {uploadedFile && (
        <div className="mt-4 text-center">
          <p className="text-gray-700">File uploaded successfully!</p>
          {uploadedFile.fileUrl && (
            <a href={uploadedFile.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              View File
            </a>
          )}
          {uploadedFile.text && (
            <div className="mt-2 p-2 border border-gray-300 rounded-md max-h-40 overflow-auto text-sm text-gray-700">
              <strong>Extracted Text:</strong> {uploadedFile.text}
              {/* <strong>Extracted link:</strong> {Id} */}

            </div>
          )}
        </div>
      )}
    </div>
  );
  

  
}
