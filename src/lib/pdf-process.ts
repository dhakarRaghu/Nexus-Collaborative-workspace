"use server";
import pdfParse from "pdf-parse"; // make sure pdf-parse is patched as needed
import { put } from "@vercel/blob";
import { getAuthSession } from "./auth";
import prisma from "./db";
import { processTextToEmbeddings } from "./chunking";
import md5 from "md5";
import { uploadToPinecone } from "./pineconedb";
import { redirect } from "next/navigation";

export async function uploadPDF(pdf: File | null) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  // Ensure a file is provided
  if (!pdf) {
    return { error: "PDF file is required" };
  }

  // If a project with the same name already exists, redirect immediately.
  const existingProject = await prisma.chatPdf.findFirst({
    where: { name: pdf.name },
  });
  if (existingProject) {
    redirect(`/chatPdf/${existingProject.id}`);
  }

  let newProject: { id: string } | undefined = undefined;
  try {
    console.log("Received file for upload");

    // Convert File to Buffer
    const arrayBuffer = await pdf.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Processing file: ${pdf.name}`);

    // Extract text from the PDF
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;
    if (!extractedText.trim()) {
      // Handle empty or whitespace-only content.
      return { error: "Extracted text is empty" };
    }
    console.log("Extracted text:", extractedText);

    // Upload the PDF to Vercel Blob Storage
    const blob = await put(pdf.name, buffer, { access: "public" });
    console.log("Blob URL:", blob.url);

    // Create a new project entry
    newProject = await prisma.chatPdf.create({
      data: {
        name: pdf.name,
        url: blob.url,
        content: extractedText,
        userId: session.user.id,
      },
    });
    console.log("New project created:", newProject);

    // Process text to embeddings
    const { chunks, chunkEmbeddings } = await processTextToEmbeddings(extractedText);
    console.log("Final Chunks:", chunks);

    if (!newProject) {
      throw new Error("New project creation failed");
    }

    const vectors = chunks.map((chunk, index) => ({
      id: md5(chunk.text),
      values: chunkEmbeddings[index],
      metadata: {
        text: chunk.text,
        startIndex: chunk.metadata.startIndex,
        endIndex: chunk.metadata.endIndex,
        title:  "PDF Document",
        description: "PDF document",
        source: blob.url,
        timestamp: new Date().toISOString(),
      }
    }));
    console.log("Vectors:", vectors);
    const namespace = newProject.id; // or another namespace as needed
    console.log("Uploading embeddings to Pinecone...");
    await uploadToPinecone(vectors, namespace);
    console.log("Processing and uploading complete.");
  } catch (error) {
    console.error("Error processing PDF:", error);
    return { error: "Failed to process PDF" };
  }

  // Finally, perform the redirect outside of the try/catch.
  redirect(`/chatPdf/${newProject!.id}`);
}
