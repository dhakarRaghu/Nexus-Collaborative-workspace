import { Pinecone } from "@pinecone-database/pinecone";
import { generateEmbedding } from './embedding';
import { refineQuery, rerankResults, generateFinalAnswer } from './geminiAPI';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Vector search using Pinecone.
 *
 * This function:
 *  - Instantiates the Pinecone client.
 *  - Retrieves the appropriate index (here: "nexus").
 *  - Selects the namespace based on the given fileKey.
 *  - Generates an embedding for the query.
 *  - Runs the query against Pinecone and returns the top matches,
 *    mapped to objects with "text" and "score" fields.
 */
export async function searchEmbeddings(
  query: string,
  fileKey: string
): Promise<Array<{ text: string; score: number }>> {
  try {
    // Create a Pinecone client instance.
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    // Retrieve the index named "chatpdf".
    const pineconeIndex = await client.index("nexus");
    
    // Use the provided fileKey as the namespace.
    const namespace = pineconeIndex.namespace(fileKey);
    
    // Generate the embedding for the query.
    const queryEmbedding = await generateEmbedding(query);
    
    // Query Pinecone with the generated embedding.
    const queryResult = await namespace.query({
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
    });
    
    // Map the matches to the expected format.
    return (queryResult.matches || []).map(match => ({
      text: String(match.metadata?.text || ""),
      score: match.score ?? 0,
    }));
  } catch (error) {
    console.error("Error querying embeddings", error);
    throw error;
  }
}

/**
 * Normalize scores between 0 and 1.
 */
function normalizeResults(results: Array<{ text: string; score: number }>): Array<{ text: string; score: number }> {
  const maxScore = Math.max(...results.map(r => r.score));
  return results.map(r => ({ ...r, score: r.score / maxScore }));
}

/**
 * Retrieval using vector search only.
 */
export async function retrieveVectorResults(query: string, projectURL: string): Promise<string[]> {
  const vectorResults = await searchEmbeddings(query, projectURL);
  const normalizedVectors = normalizeResults(vectorResults);

  // Sort by descending score.
  const sortedResults = normalizedVectors.sort((a, b) => b.score - a.score);
  
  // Take the top 5 unique results (based on text).
  const uniqueResults: { [key: string]: number } = {};
  const topResults: string[] = [];
  for (const result of sortedResults) {
    if (!uniqueResults[result.text]) {
      uniqueResults[result.text] = result.score;
      topResults.push(result.text);
      if (topResults.length === 5) break;
    }
  }
  return topResults;
}


/**
 * Full retrieval pipeline.
 */
export async function retrieveAnswer(query: string, projectURL: string): Promise<string> {
  // Refine the query using Gemini/GPT.
  const refinedQuery = await refineQuery(query);
  console.log("Refined Query:", refinedQuery);

  // Retrieve results using vector search.
  const initialResults = await retrieveVectorResults(refinedQuery, projectURL);
  console.log("Initial Retrieval Results:", initialResults);

  // Re-rank the results.
  const rankedResults = await rerankResults(refinedQuery, initialResults);
  console.log("Re-ranked Results:", rankedResults);

  // Generate the final answer.
  const finalAnswer = await generateFinalAnswer(refinedQuery, rankedResults);
  return finalAnswer;
}
