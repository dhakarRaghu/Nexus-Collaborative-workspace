import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import { quantile } from 'd3-array';
import * as math from 'mathjs';
import { generateEmbedding, generateEmbeddings } from './embedding';
import dotenv from 'dotenv';
dotenv.config();



const generativeModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({
  model: "text-bison-001",  // Change to an appropriate generative model if needed.
});
export interface SentenceObject {
  sentence: string;
  index: number;
  combined_sentence?: string;
  combined_sentence_embedding?: number[];
  distance_to_next?: number;
}

/**
 * Configuration options for the chunking process.
 */
export interface ChunkingOptions {
  bufferSize?: number; // Number of adjacent sentences to include for context (default: 1)
  mergeLengthThreshold?: number; // Minimum length (in characters) below which chunks will be merged (default: 300)
  cosineSimThreshold?: number; // Cosine similarity threshold above which chunks are merged (default: 0.8)
  percentileThreshold?: number; // Percentile (e.g., 90 means 90th percentile) for detecting semantic shift (default: 90)
  useLLMForMerge?: boolean; // Toggle for using an LLM-based decision for merging (default: false)
}

/**
 * Splits text into sentences using a simple NLP tokenizer.
 */
export function splitToSentencesUsingNLP(text: string): string[] {
  const cleanedText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return [];
  const tokenizer = new natural.SentenceTokenizer([]);
  const sentences = tokenizer.tokenize(cleanedText);
  console.log(`Tokenized into ${sentences.length} sentences.`);
  return sentences.map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
}

/**
 * Structure each sentence with a surrounding buffer of one sentence before and after.
 * Also attaches the original sentence index as metadata.
 */
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

/**
 * Generate and attach embeddings for each structured sentence.
 */
export async function generateAndAttachEmbeddings(sentenceObjects: SentenceObject[]): Promise<SentenceObject[]> {
  for (let i = 0; i < sentenceObjects.length; i++) {
    if (sentenceObjects[i].combined_sentence) {
      try {
        const embedding = await generateEmbedding(sentenceObjects[i].combined_sentence!);
        sentenceObjects[i].combined_sentence_embedding = embedding;
        console.log(`Generated embedding for sentence index ${i}.`);
      } catch (error) {
        console.error(`Error generating embedding for sentence at index ${i}:`, error);
      }
    }
  }
  return sentenceObjects;
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = math.dot(vecA, vecB) as number;
  const normA = math.norm(vecA) as number;
  const normB = math.norm(vecB) as number;
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Compute cosine distances between adjacent sentence embeddings and detect significant shifts.
 * The percentile threshold is configurable.
 */
export function calculateCosineDistancesAndSignificantShifts(
  sentenceObjects: SentenceObject[],
  percentileThreshold: number = 90
): { updatedArray: SentenceObject[]; significantShiftIndices: number[] } {
  const distances: number[] = [];
  const updatedArray = sentenceObjects.map((obj, index, arr) => {
    if (index < arr.length - 1 && obj.combined_sentence_embedding && arr[index + 1].combined_sentence_embedding) {
      const sim = cosineSimilarity(obj.combined_sentence_embedding!, arr[index + 1].combined_sentence_embedding!);
      const distance = 1 - sim;
      distances.push(distance);
      return { ...obj, distance_to_next: distance };
    }
    return { ...obj, distance_to_next: undefined };
  });

  const sortedDistances = [...distances].sort((a, b) => a - b);
  const quantileThreshold = percentileThreshold / 100;
  const breakpointDistanceThreshold = quantile(sortedDistances, quantileThreshold);
  if (breakpointDistanceThreshold === undefined) {
    throw new Error("Failed to calculate breakpoint distance threshold");
  }
  const significantShiftIndices = distances
    .map((d, i) => (d > breakpointDistanceThreshold ? i : -1))
    .filter(index => index !== -1);

  console.log(`Calculated significant shifts at indices: ${significantShiftIndices}`);
  return { updatedArray, significantShiftIndices };
}

/**
 * Group sentences into chunks based on significant shift indices.
 * Also attaches metadata about original sentence indices for traceability.
 */
export function groupSentencesIntoChunks(
  sentenceObjects: SentenceObject[],
  shiftIndices: number[]
): { chunks: string[], chunkMetadata: Array<{ startIndex: number; endIndex: number }> } {
  let startIdx = 0;
  const chunks: string[] = [];
  const chunkMetadata: Array<{ startIndex: number; endIndex: number }> = [];
  // Append the last index to ensure all sentences are grouped.
  const breakpoints = [...shiftIndices, sentenceObjects.length - 1];
  for (const breakpoint of breakpoints) {
    const group = sentenceObjects.slice(startIdx, breakpoint + 1);
    const combinedText = group.map(obj => obj.sentence).join(" ");
    chunks.push(combinedText);
    chunkMetadata.push({ startIndex: startIdx, endIndex: breakpoint });
    console.log(`Chunk from sentence ${startIdx} to ${breakpoint} with ${group.length} sentences.`);
    startIdx = breakpoint + 1;
  }
  return { chunks, chunkMetadata };
}

/**
 * A placeholder for an LLM-based merging decision.
 * If useLLMForMerge is true, this function should call an LLM (e.g., GPT) to decide whether to merge.
 * For now, it falls back to the simple heuristic.
 */
async function shouldMergeChunksLLM(chunkA: string, chunkB: string): Promise<boolean> {
//   console.log("LLM-based merge decision is not yet implemented. Falling back to heuristic.");
//   return shouldMergeChunksHeuristic(chunkA, chunkB);
console.log("Using LLM-based merge decision.");
// Create a generative model instance that supports text generation.
// Change the model name if necessary.
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({
    model: "text-bison-001", // Assumed generative model; update as needed.
    });

    const prompt = `You are a content merging assistant. Given two text chunks, decide if they should be merged to preserve context and coherence.

    Chunk A: "${chunkA}"

    Chunk B: "${chunkB}"

    Please respond with a JSON object in the following format (without any additional text):
    {"merge": true} or {"merge": false}`;

    try {
    const result = await model.generateContent(prompt);
    console.log("LLM response:", result.response.text());
    // Attempt to parse the JSON response.
    const parsed = JSON.parse(result.response.text());
    if (typeof parsed.merge === 'boolean') {
        return parsed.merge;
    } else {
        console.error("Unexpected response format from LLM:", result.response.text());
        // Fallback to heuristic decision.
        return shouldMergeChunksHeuristic(chunkA, chunkB);
    }
    } catch (error) {
    console.error("Error using LLM for merge decision:", error);
    // Fall back to the heuristic.
    return shouldMergeChunksHeuristic(chunkA, chunkB);
    }
}

/**
 * Simple heuristic: merge if both chunks are short or if their embeddings are highly similar.
 */
async function shouldMergeChunksHeuristic(chunkA: string, chunkB: string, mergeLengthThreshold: number = 300, cosineSimThreshold: number = 0.9): Promise<boolean> {
  if (chunkA.length < mergeLengthThreshold && chunkB.length < mergeLengthThreshold) {
    console.log(`Merging chunks due to short length: lengths ${chunkA.length} and ${chunkB.length}`);
    return true;
  }
  try {
    const [embeddingA, embeddingB] = await Promise.all([generateEmbedding(chunkA), generateEmbedding(chunkB)]);
    const sim = cosineSimilarity(embeddingA, embeddingB);
    console.log(`Cosine similarity between chunks: ${sim}`);
    return sim > cosineSimThreshold;
  } catch (error) {
    console.error("Error in merging decision heuristic:", error);
    return false;
  }
}

/**
 * Decide whether to merge two chunks based on configuration.
 */
export async function shouldMergeChunks(chunkA: string, chunkB: string, options: ChunkingOptions): Promise<boolean> {
  if (options.useLLMForMerge) {
    return shouldMergeChunksLLM(chunkA, chunkB);
  } else {
    return shouldMergeChunksHeuristic(chunkA, chunkB, options.mergeLengthThreshold, options.cosineSimThreshold);
  }
}

/**
 * Traverse preliminary chunks and merge adjacent ones if the decision returns true.
 */
export async function agenticMergeChunks(chunks: string[], options: ChunkingOptions): Promise<string[]> {
  if (chunks.length === 0) return [];
  const mergedChunks: string[] = [];
  let currentChunk = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const candidate = chunks[i];
    const mergeDecision = await shouldMergeChunks(currentChunk, candidate, options);
    if (mergeDecision) {
      console.log(`Merging chunk ${i - 1} and chunk ${i}.`);
      currentChunk = currentChunk + " " + candidate;
    } else {
      mergedChunks.push(currentChunk);
      currentChunk = candidate;
    }
  }
  mergedChunks.push(currentChunk);
  console.log(`Agentic merging complete. ${mergedChunks.length} chunks remain.`);
  return mergedChunks;
}

/**
 * (Optional) Secondary pass for contextual reassessment.
 * You could implement further merging or splitting based on the overall content flow.
 */
export async function secondaryReassessment(chunks: string[]): Promise<string[]> {
//   For now, simply return the input.
  console.log("Secondary reassessment not implemented. Returning original chunks.");
  return chunks;
    // console.log("Starting secondary reassessment of chunks using LLM-based evaluation.");
    // if (chunks.length < 2) return chunks;

    // const mergedChunks: string[] = [];
    // let currentChunk = chunks[0];

    // // Evaluate adjacent pairs using the LLM-based decision.
    // for (let i = 1; i < chunks.length; i++) {
    // const candidate = chunks[i];
    // const shouldMerge = await shouldMergeChunksLLM(currentChunk, candidate);
    // if (shouldMerge) {
    //     console.log(`Secondary reassessment: merging chunks ${i - 1} and ${i}.`);
    //     currentChunk = currentChunk + " " + candidate;
    // } else {
    //     mergedChunks.push(currentChunk);
    //     currentChunk = candidate;
    // }
    // }
    // mergedChunks.push(currentChunk);
    // console.log(`Secondary reassessment complete. Final chunk count: ${mergedChunks.length}`);
    // return mergedChunks;
}

/**
 * Aggregate an array of embeddings by averaging each dimension.
 */
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

/**
 * Process text into final chunks, batch-embed them, and compute an aggregated embedding.
 * Accepts an optional configuration object for fine-tuning the process.
 */
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
  chunks: string[];
  chunkEmbeddings: number[][];
  aggregatedEmbedding: number[];
  chunkMetadata: Array<{ startIndex: number; endIndex: number }>;
}> {
  // Step 1. Semantic chunking based on sentence structure and semantic shifts.
  const sentences = splitToSentencesUsingNLP(text);
  const structured = structureSentences(sentences, options.bufferSize);
  const withEmbeddings = await generateAndAttachEmbeddings(structured);
  const { updatedArray, significantShiftIndices } = calculateCosineDistancesAndSignificantShifts(withEmbeddings, options.percentileThreshold);
  const { chunks: preliminaryChunks, chunkMetadata } = groupSentencesIntoChunks(updatedArray, significantShiftIndices);

  // Step 2. Agentically merge chunks if needed.
  const mergedChunks = await agenticMergeChunks(preliminaryChunks, options);

  // Optional: Secondary pass for further refinement.
  const finalChunks = await secondaryReassessment(mergedChunks);

  // Step 3. Batch-embed the final chunks.
  const chunkEmbeddings = await generateEmbeddings(finalChunks, 3);
  // Step 4. Aggregate embeddings (e.g., by averaging).
  const aggregatedEmbedding = aggregateEmbeddings(chunkEmbeddings);

  console.log("Final processing complete.");
  return {
    chunks: finalChunks,
    chunkEmbeddings,
    aggregatedEmbedding,
    chunkMetadata,
  };
}
