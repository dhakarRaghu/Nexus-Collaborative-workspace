import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import { quantile } from 'd3-array';
import * as math from 'mathjs';
import { generateEmbedding, generateEmbeddings } from './embedding';
import dotenv from 'dotenv';
dotenv.config();

// Instantiate a generative model once.
const generativeModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
  .getGenerativeModel({ model: "text-bison-001" });

// In-memory cache for embeddings.
const embeddingCache = new Map<string, number[]>();

// Cached wrapper for generating a single embedding.
export async function cachedGenerateEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    console.log("Using cached embedding for text:", text.substring(0, 30));
    return embeddingCache.get(text)!;
  }
  const emb = await generateEmbedding(text);
  embeddingCache.set(text, emb);
  return emb;
}

// Cached wrapper for generating embeddings in batch.
export async function cachedGenerateEmbeddings(texts: string[], batchSize: number): Promise<number[][]> {
  const embeddings: number[][] = new Array(texts.length);
  const textsToFetch: string[] = [];
  const indexesToFetch: number[] = [];
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (embeddingCache.has(text)) {
      console.log("Using cached embedding for text:", text.substring(0, 30));
      embeddings[i] = embeddingCache.get(text)!;
    } else {
      textsToFetch.push(text);
      indexesToFetch.push(i);
    }
  }
  
  if (textsToFetch.length > 0) {
    const newEmbeddings = await generateEmbeddings(textsToFetch, batchSize);
    for (let j = 0; j < textsToFetch.length; j++) {
      embeddingCache.set(textsToFetch[j], newEmbeddings[j]);
      embeddings[indexesToFetch[j]] = newEmbeddings[j];
    }
  }
  
  return embeddings;
}

// Interfaces
export interface SentenceObject {
  sentence: string;
  index: number;
  combined_sentence?: string;
  combined_sentence_embedding?: number[];
  distance_to_next?: number;
}

export interface ChunkingOptions {
  bufferSize?: number; // Context window size.
  mergeLengthThreshold?: number; // Threshold for merging short chunks.
  cosineSimThreshold?: number; // Cosine similarity threshold for merging.
  percentileThreshold?: number; // Percentile for semantic shift detection.
  useLLMForMerge?: boolean; // Whether to use LLM-based merge decisions.
}

export interface ChunkWithMetadata {
  text: string;
  metadata: {
    startIndex: number;
    endIndex: number;
  };
}

// Split text into sentences using natural language processing.
export function splitToSentencesUsingNLP(text: string): string[] {
  const cleanedText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return [];
  const tokenizer = new natural.SentenceTokenizer([]);
  const sentences = tokenizer.tokenize(cleanedText);
  console.log(`Tokenized into ${sentences.length} sentences.`);
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// Structure sentences with a surrounding buffer for context.
export function structureSentences(sentences: string[], bufferSize: number = 1): SentenceObject[] {
  const sentenceObjects: SentenceObject[] = sentences.map((sentence, i) => ({
    sentence,
    index: i,
  }));
  sentenceObjects.forEach((obj, i) => {
    let combined = "";
    for (let j = i - bufferSize; j < i; j++) {
      if (j >= 0) combined += sentenceObjects[j].sentence + " ";
    }
    combined += obj.sentence + " ";
    for (let j = i + 1; j <= i + bufferSize; j++) {
      if (j < sentenceObjects.length) combined += sentenceObjects[j].sentence + " ";
    }
    obj.combined_sentence = combined.trim();
  });
  console.log(`Structured sentences with buffer size = ${bufferSize}.`);
  return sentenceObjects;
}

// Generate and attach embeddings for each structured sentence in parallel.
export async function generateAndAttachEmbeddings(sentenceObjects: SentenceObject[]): Promise<SentenceObject[]> {
  await Promise.all(
    sentenceObjects.map(async (obj, i) => {
      if (obj.combined_sentence) {
        try {
          const embedding = await cachedGenerateEmbedding(obj.combined_sentence);
          obj.combined_sentence_embedding = embedding;
          console.log(`Generated embedding for sentence index ${i}.`);
        } catch (error) {
          console.error(`Error generating embedding for sentence at index ${i}:`, error);
        }
      }
    })
  );
  return sentenceObjects;
}

// Compute cosine similarity between two vectors.
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = math.dot(vecA, vecB) as number;
  const normA = math.norm(vecA) as number;
  const normB = math.norm(vecB) as number;
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// Compute cosine distances between adjacent sentence embeddings and detect significant shifts.
export function calculateCosineDistancesAndSignificantShifts(
  sentenceObjects: SentenceObject[],
  percentileThreshold: number = 90
): { updatedArray: SentenceObject[]; significantShiftIndices: number[] } {
  const distances: number[] = [];
  const updatedArray = sentenceObjects.map((obj, index, arr) => {
    if (
      index < arr.length - 1 &&
      obj.combined_sentence_embedding &&
      arr[index + 1].combined_sentence_embedding
    ) {
      const sim = cosineSimilarity(obj.combined_sentence_embedding!, arr[index + 1].combined_sentence_embedding!);
      const distance = 1 - sim;
      distances.push(distance);
      return { ...obj, distance_to_next: distance };
    }
    return { ...obj, distance_to_next: undefined };
  });
  
  if (distances.length === 0) {
    console.warn("No distances computed; returning empty significant shift indices.");
    return { updatedArray, significantShiftIndices: [] };
  }
  
  const sortedDistances = [...distances].sort((a, b) => a - b);
  const quantileThreshold = percentileThreshold / 100;
  const breakpointDistanceThreshold = quantile(sortedDistances, quantileThreshold);
  if (breakpointDistanceThreshold === undefined) {
    throw new Error("Failed to calculate breakpoint distance threshold");
  }
  const significantShiftIndices = distances
    .map((d, i) => (d > breakpointDistanceThreshold ? i : -1))
    .filter(i => i !== -1);
  console.log(`Calculated significant shifts at indices: ${significantShiftIndices}`);
  return { updatedArray, significantShiftIndices };
}

// Group sentences into chunks based on significant shifts.
export function groupSentencesIntoChunks(
  sentenceObjects: SentenceObject[],
  shiftIndices: number[]
): ChunkWithMetadata[] {
  let startIdx = 0;
  const chunks: ChunkWithMetadata[] = [];
  const breakpoints = [...shiftIndices, sentenceObjects.length - 1];
  for (const breakpoint of breakpoints) {
    const group = sentenceObjects.slice(startIdx, breakpoint + 1);
    const combinedText = group.map(obj => obj.sentence).join(" ");
    chunks.push({
      text: combinedText,
      metadata: { startIndex: startIdx, endIndex: breakpoint }
    });
    console.log(`Chunk from sentence ${startIdx} to ${breakpoint} with ${group.length} sentences.`);
    startIdx = breakpoint + 1;
  }
  return chunks;
}

// LLM-based merge decision using the global generative model.
async function shouldMergeChunksLLM(chunkA: string, chunkB: string): Promise<boolean> {
  console.log("Using LLM-based merge decision.");
  const prompt = `You are a content merging assistant. Given two text chunks, decide if they should be merged to preserve context and coherence.

Chunk A: "${chunkA}"

Chunk B: "${chunkB}"

Please respond with a JSON object in the following format (without any additional text):
{"merge": true} or {"merge": false}`;
  try {
    const result = await generativeModel.generateContent(prompt);
    const responseText = result.response.text();
    console.log("LLM response:", responseText);
    const parsed = JSON.parse(responseText);
    if (typeof parsed.merge === 'boolean') {
      return parsed.merge;
    }
    console.error("Unexpected response format from LLM:", responseText);
    return shouldMergeChunksHeuristic(chunkA, chunkB);
  } catch (error) {
    console.error("Error using LLM for merge decision:", error);
    return shouldMergeChunksHeuristic(chunkA, chunkB);
  }
}

// Heuristic-based merge decision.
async function shouldMergeChunksHeuristic(
  chunkA: string,
  chunkB: string,
  mergeLengthThreshold: number = 300,
  cosineSimThreshold: number = 0.9
): Promise<boolean> {
  if (chunkA.length < mergeLengthThreshold && chunkB.length < mergeLengthThreshold) {
    console.log(`Merging chunks due to short length: ${chunkA.length} and ${chunkB.length}`);
    return true;
  }
  try {
    const [embeddingA, embeddingB] = await Promise.all([
      cachedGenerateEmbedding(chunkA),
      cachedGenerateEmbedding(chunkB)
    ]);
    const sim = cosineSimilarity(embeddingA, embeddingB);
    console.log(`Cosine similarity between chunks: ${sim}`);
    return sim > cosineSimThreshold;
  } catch (error) {
    console.error("Error in merging decision heuristic:", error);
    return false;
  }
}

// Decide whether to merge two chunks.
export async function shouldMergeChunks(
  chunkA: string,
  chunkB: string,
  options: ChunkingOptions
): Promise<boolean> {
  if (options.useLLMForMerge) {
    return shouldMergeChunksLLM(chunkA, chunkB);
  } else {
    return shouldMergeChunksHeuristic(
      chunkA,
      chunkB,
      options.mergeLengthThreshold,
      options.cosineSimThreshold
    );
  }
}

// Merge adjacent chunks agentically.
export async function agenticMergeChunks(
  chunks: ChunkWithMetadata[],
  options: ChunkingOptions
): Promise<ChunkWithMetadata[]> {
  if (chunks.length === 0) return [];
  const mergedChunks: ChunkWithMetadata[] = [];
  let currentChunk = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const candidate = chunks[i];
    const mergeDecision = await shouldMergeChunks(currentChunk.text, candidate.text, options);
    if (mergeDecision) {
      console.log(`Merging chunk from ${currentChunk.metadata.startIndex} to ${candidate.metadata.endIndex}.`);
      currentChunk = {
        text: currentChunk.text + " " + candidate.text,
        metadata: {
          startIndex: currentChunk.metadata.startIndex,
          endIndex: candidate.metadata.endIndex,
        }
      };
    } else {
      mergedChunks.push(currentChunk);
      currentChunk = candidate;
    }
  }
  mergedChunks.push(currentChunk);
  console.log(`Agentic merging complete. ${mergedChunks.length} chunks remain.`);
  return mergedChunks;
}

// Optional secondary reassessment.
export async function secondaryReassessment(chunks: ChunkWithMetadata[]): Promise<ChunkWithMetadata[]> {
  console.log("Secondary reassessment not implemented. Returning original chunks.");
  return chunks;
}

// Aggregate an array of embeddings by averaging each dimension.
export function aggregateEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dims = embeddings[0].length;
  const avg = new Array(dims).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) {
      avg[i] += emb[i];
    }
  }
  for (let i = 0; i < dims; i++) {
    avg[i] /= embeddings.length;
  }
  console.log("Aggregated embedding computed.");
  return avg;
}

// Main processing function: tokenizes, structures, attaches embeddings, groups, merges, and generates final embeddings.
export async function processTextToEmbeddings(
  text: string,
  options: ChunkingOptions = {
    bufferSize: 1,
    mergeLengthThreshold: 300,
    cosineSimThreshold: 0.8,
    percentileThreshold: 90,
    useLLMForMerge: false,
  }
): Promise<{
  chunks: ChunkWithMetadata[];
  chunkEmbeddings: number[][];
}> {
  // Step 1: Tokenize and structure.
  const sentences = splitToSentencesUsingNLP(text);
  const structured = structureSentences(sentences, options.bufferSize);
  const withEmbeddings = await generateAndAttachEmbeddings(structured);
  const { updatedArray, significantShiftIndices } = calculateCosineDistancesAndSignificantShifts(withEmbeddings, options.percentileThreshold);
  
  // Group into preliminary chunks.
  const preliminaryChunks = groupSentencesIntoChunks(updatedArray, significantShiftIndices);
  
  // Step 2: Merge chunks agentically.
  const mergedChunks = await agenticMergeChunks(preliminaryChunks, options);
  
  // Step 3: Optional secondary reassessment.
  const finalChunks = await secondaryReassessment(mergedChunks);
  
  // Step 4: Generate embeddings for final chunks using caching.
  const textsForEmbedding = finalChunks.map(chunk => chunk.text);
  const chunkEmbeddings = await cachedGenerateEmbeddings(textsForEmbedding, 3);
  console.log("Final processing complete.");
  
  return {
    chunks: finalChunks,
    chunkEmbeddings,
  };
}
