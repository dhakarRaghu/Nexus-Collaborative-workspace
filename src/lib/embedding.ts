import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const googleai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({
  model: "text-embedding-004",
});

const MAX_PAYLOAD_BYTES = 9000; // Maximum allowed payload in bytes
const OVERLAP_BYTES = 1000;     // Number of bytes to overlap between chunks

/**
 * Splits a large text into overlapping sub-chunks using a sliding window approach.
 * It uses TextEncoder to work in terms of bytes.
 *
 * @param text - The input text to be split.
 * @param maxBytes - Maximum number of bytes allowed per sub-chunk.
 * @param overlapBytes - Number of bytes to overlap between sub-chunks.
 * @returns An array of text sub-chunks that each fit within the maxBytes limit.
 */
function splitLargeTextIntoOverlappingChunks(text: string, maxBytes: number, overlapBytes: number): string[] {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  
  if (encodedText.length <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  // We work in character space, but adjust using encoded lengths
  while (start < text.length) {
    let end = start;
    let currentChunk = "";

    // Increase end until the encoded length exceeds maxBytes.
    while (end < text.length) {
      const tempChunk = text.substring(start, end + 1);
      const tempEncoded = encoder.encode(tempChunk);
      if (tempEncoded.length > maxBytes) {
        break;
      }
      currentChunk = tempChunk;
      end++;
    }

    // Push the chunk if it's non-empty.
    if (currentChunk) {
      chunks.push(currentChunk);
    } else {
      // If we can't add even one more character (edge case), break.
      break;
    }

    // Slide the window forward:
    // We'll subtract the overlap (in characters, assuming roughly 1 char ≈ 1 byte for mostly ASCII text).
    // For non-ASCII text, you might want to use a more sophisticated method.
    start = end - overlapBytes;
    if (start < 0) start = 0;
    // Safety: if the window doesn't progress, break to avoid an infinite loop.
    if (end === start) {
      break;
    }
  }

  return chunks;
}

/**
 * A helper that ensures the text is within size limits.
 * If it is too large, it returns overlapping sub-chunks.
 * Otherwise, it returns the original text in an array.
 */
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
 * Generate embeddings for a text.
 * If the text is too large, it is split into overlapping sub-chunks,
 * embeddings for each sub-chunk are generated, and then averaged.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const chunks = safeTextForEmbedding(text);
  if (chunks.length === 1) {
    // If the text is within limits, process it directly.
    try {
      const result = await googleai.embedContent(chunks[0]);
      return result.embedding.values;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  } else {
    // If the text was split into multiple chunks, generate embeddings for each and average them.
    try {
      const embeddings = await Promise.all(chunks.map(chunk => googleai.embedContent(chunk)));
      const allValues = embeddings.map(r => r.embedding.values);
      // Average each dimension across embeddings.
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

  
  // Batch process multiple texts for embeddings. You can later adjust the batch size.
  export async function generateEmbeddings(texts: string[], batchSize: number = 3): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      // Fire off the embedding requests concurrently for this batch.
      const batchResults = await Promise.all(batch.map(text => generateEmbedding(text)));
      embeddings.push(...batchResults);
      // Optionally wait a bit between batches to ease rate limiting.
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return embeddings;
  }
  
  