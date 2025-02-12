"use server";
import pdfParse from "pdf-parse";      // in nodemodule comments the testing part in pdf-parse/index.js  to eliminate the error 005...
import { put } from  "@vercel/blob";
import { redirect } from "next/navigation";
import { getAuthSession } from "./auth";
import prisma from "./db";
import { processTextToEmbeddings } from "./chunking";
import md5 from "md5";
import { uploadToPinecone } from "./pineconedb";

export async function uploadPDF(pdf: File | null) {

    const session = await getAuthSession();
    if (!session?.user) {
      redirect("/login");
    }

  try {
    console.log("Received file for upload");

    // Ensure a file is provided
    if (!pdf) {
      return { error: "PDF file is required" };
    }

    // Convert File to Buffer
    const arrayBuffer = await pdf.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Processing file: ${pdf.name}`);

    // Extract text from the PDF
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    // Upload the PDF to Vercel Blob Storage
    const blob = await put(pdf.name, buffer, { access: "public" });
    console.log("blob" , blob);

    let chat_id: any[] = [];
    if (extractedText) {
      console.log("Extracted text:", extractedText);
      try {
        console.log("Processing file:", pdf.name);
        const fileKey = `${pdf.name}-${Date.now()}.pdf`;
        const newProject = await prisma.chatPdf.create({
          data: {
            name: pdf.name,
            url: blob.url,
            content: extractedText,
            userId: session.user.id,
          },
        });
    

      } catch (error) {
        console.error("Error processing text:", error);
      }
    } else {
      console.warn("Invalid file input. Skipping processing.");
    }

    return {
      message: "File uploaded and processed successfully",
      chat_id : chat_id.length > 0 ? chat_id[0].insertedId : null,
      text: extractedText,
      fileUrl: blob.url,
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    return { error: "Failed to process PDF" };
  }
}
