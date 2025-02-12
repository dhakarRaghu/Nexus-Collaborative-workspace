// embedding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const googleai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
  .getGenerativeModel({ model: "text-embedding-004" });

export const MAX_PAYLOAD_BYTES = 9000;
export const OVERLAP_BYTES = 1000;
export const API_CALL_DELAY_MS = 0; // delay between API calls to avoid rate limiting

function splitLargeTextIntoOverlappingChunks(text: string, maxBytes: number, overlapBytes: number): string[] {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  if (encodedText.length <= maxBytes) {
    return [text];
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start;
    let currentChunk = "";
    while (end < text.length) {
      const tempChunk = text.substring(start, end + 1);
      const tempEncoded = encoder.encode(tempChunk);
      if (tempEncoded.length > maxBytes) {
        break;
      }
      currentChunk = tempChunk;
      end++;
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    } else {
      break;
    }
    start = end - overlapBytes;
    if (start < 0) start = 0;
    if (end === start) break;
  }
  return chunks;
}

function safeTextForEmbedding(text: string): string[] {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  if (encoded.length <= MAX_PAYLOAD_BYTES) {
    return [text];
  } else {
    console.warn(`Text payload size (${encoded.length} bytes) exceeds limit. Splitting using overlapping sliding window.`);
    return splitLargeTextIntoOverlappingChunks(text, MAX_PAYLOAD_BYTES, OVERLAP_BYTES);
  }
}

/**
 * Generate embedding for a given text.
 * If the text is too long, it is split into overlapping chunks and each chunk is processed sequentially
 * with a delay between API calls. The final embedding is the average of the individual embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const chunks = safeTextForEmbedding(text);
  if (chunks.length === 1) {
    try {
      const result = await googleai.embedContent(chunks[0]);
      return result.embedding.values;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  } else {
    try {
      // Process each chunk sequentially with a delay to avoid rate limiting.
      const embeddings: number[][] = [];
      for (const chunk of chunks) {
        const result = await googleai.embedContent(chunk);
        embeddings.push(result.embedding.values);
        // Wait before processing the next chunk.
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
      }
      // Average the embeddings.
      const dims = embeddings[0].length;
      const avgEmbedding = new Array(dims).fill(0);
      for (const emb of embeddings) {
        for (let i = 0; i < dims; i++) {
          avgEmbedding[i] += emb[i];
        }
      }
      for (let i = 0; i < dims; i++) {
        avgEmbedding[i] /= embeddings.length;
      }
      return avgEmbedding;
    } catch (error) {
      console.error("Error generating embeddings for overlapping chunks:", error);
      throw error;
    }
  }
}

/**
 * Generate embeddings for an array of texts in batches.
 * A delay is added between batches to manage rate limits.
 */
export async function generateEmbeddings(texts: string[], batchSize: number = 3): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = [];
    // Process each text in the batch sequentially (to be safe), or adjust if parallel processing is acceptable.
    for (const text of batch) {
      const emb = await generateEmbedding(text);
      batchResults.push(emb);
    }
    embeddings.push(...batchResults);
    // Delay between batches.
    await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
  }
  return embeddings;
}
