import { Pool } from 'pg';
import { PineconeClient } from "@pinecone-database/pinecone";
import { generateEmbedding } from './embedding';
import { refineQuery, rerankResults, generateFinalAnswer } from './geminiAPI';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * BM25 Search using PostgreSQL's full-text search.
 */
export async function searchBM25(query: string): Promise<Array<{ text: string; score: number }>> {
  const res = await pool.query(
    `SELECT text,
      ts_rank_cd(to_tsvector('english', text), plainto_tsquery($1)) AS score
    FROM documents
    WHERE to_tsvector('english', text) @@ plainto_tsquery($1)
    ORDER BY score DESC
    LIMIT 10;`,
    [query]
  );
  return res.rows;
}

/**
 * Vector search using Pinecone.
 */
export async function searchEmbeddings(query: string): Promise<Array<{ text: string; score: number }>> {
  const pinecone = new PineconeClient();
  await pinecone.init({ apiKey: process.env.PINECONE_API_KEY! });
  // Assume index name is "documents"
  const index = pinecone.Index("documents");
  const queryEmbedding = await generateEmbedding(query);
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: 10,
    includeMetadata: true,
  });
  // Map the results
  return queryResponse.matches.map(match => ({
    text: match.metadata?.text || "",
    score: match.score,
  }));
}

/**
 * Normalize scores between 0 and 1.
 */
function normalizeResults(results: Array<{ text: string; score: number }>): Array<{ text: string; score: number }> {
  const maxScore = Math.max(...results.map(r => r.score));
  return results.map(r => ({ ...r, score: r.score / maxScore }));
}

/**
 * Hybrid retrieval: combine BM25 and vector search results.
 */
export async function hybridRetrieve(query: string): Promise<string[]> {
  const [bm25Results, vectorResults] = await Promise.all([
    searchBM25(query),
    searchEmbeddings(query),
  ]);

  const normalizedBM25 = normalizeResults(bm25Results);
  const normalizedVectors = normalizeResults(vectorResults);

  // Merge results and sort by descending score
  const combined = [...normalizedBM25, ...normalizedVectors].sort((a, b) => b.score - a.score);
  // Take top 5 unique results (based on text)
  const uniqueResults: { [key: string]: number } = {};
  const topResults: string[] = [];
  for (const result of combined) {
    if (!uniqueResults[result.text]) {
      uniqueResults[result.text] = result.score;
      topResults.push(result.text);
      if (topResults.length === 5) break;
    }
  }
  return topResults;
}

/**
 * Full retrieval pipeline:
 * 1. Refine the query.
 * 2. Use hybrid retrieval to get initial results.
 * 3. Re-rank results using an LLM.
 * 4. Generate the final answer.
 */
export async function retrieveAnswer(query: string): Promise<string> {
  // Refine the query using Gemini/GPT.
  const refinedQuery = await refineQuery(query);
  console.log("Refined Query:", refinedQuery);

  // Retrieve results using hybrid search.
  const initialResults = await hybridRetrieve(refinedQuery);
  console.log("Initial Retrieval Results:", initialResults);

  // Re-rank the results.
  const rankedResults = await rerankResults(refinedQuery, initialResults);
  console.log("Re-ranked Results:", rankedResults);

  // Generate the final answer.
  const finalAnswer = await generateFinalAnswer(refinedQuery, rankedResults);
  return finalAnswer;
}

