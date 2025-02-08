// embedding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const googleai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({
  model: "text-embedding-004",
});

const MAX_PAYLOAD_BYTES = 9000;
const OVERLAP_BYTES = 1000;

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
      const embeddings = await Promise.all(chunks.map(chunk => googleai.embedContent(chunk)));
      const allValues = embeddings.map(r => r.embedding.values);
      const dims = allValues[0].length;
      const avgEmbedding = new Array(dims).fill(0);
      for (const emb of allValues) {
        for (let i = 0; i < dims; i++) {
          avgEmbedding[i] += emb[i];
        }
      }
      for (let i = 0; i < dims; i++) {
        avgEmbedding[i] /= allValues.length;
      }
      return avgEmbedding;
    } catch (error) {
      console.error("Error generating embeddings for overlapping chunks:", error);
      throw error;
    }
  }
}

export async function generateEmbeddings(texts: string[], batchSize: number = 3): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(text => generateEmbedding(text)));
    embeddings.push(...batchResults);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return embeddings;
}
