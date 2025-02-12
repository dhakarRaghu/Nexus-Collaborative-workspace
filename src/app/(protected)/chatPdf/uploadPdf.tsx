"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload } from "lucide-react"
import toast from "react-hot-toast"
import { uploadPDF } from "@/lib/pdf-process"
import { useRouter } from "next/navigation"

export default function UploadPDF() {
  const router = useRouter()
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)

  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
  const ALLOWED_FORMATS = ["application/pdf"]

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 4MB limit.")
      return
    }
    if (!ALLOWED_FORMATS.includes(selectedFile.type)) {
      toast.error("Only PDF files are allowed.")
      return
    }
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return
    try {
      setUploading(true)
      const response = await uploadPDF(file)
      if (response.error) {
        throw new Error(response.error)
      }
      toast.success("Upload successful!")
      // Optionally, redirect or update UI here
    } catch (err) {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6">
      <div
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 border-gray-300 hover:border-primary hover:bg-primary/5"
        onClick={() => inputFileRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 text-center">Drag & Drop your file here or Click to upload</p>
        <Button type="button" variant="outline" className="mt-4">
          Select File
        </Button>
      </div>

      <input
        ref={inputFileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
      />

      {file && <p className="text-sm text-gray-700 text-center">Selected: {file.name}</p>}

      <Button type="button" disabled={uploading || !file} onClick={handleUpload} className="w-full">
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </Card>
  )
}

