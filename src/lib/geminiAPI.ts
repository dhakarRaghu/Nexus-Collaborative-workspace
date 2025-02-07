
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const generativeModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({
  model: "text-bison-001",  // Change to an appropriate generative model if needed.
});

/**
 * Refine the user's query for better retrieval.
 */
export async function refineQuery(query: string): Promise<string> {
  const prompt = `
Given a user query: "${query}", please rephrase it to improve search relevance.
Respond only with the refined query.
`;
  try {
    const response = await generativeModel.generate(prompt);
    console.log("Refined query:", response.text);
    return response.text.trim();
  } catch (error) {
    console.error("Error refining query:", error);
    return query;
  }
}

/**
 * Re-rank retrieval results based on the user query.
 */
export async function rerankResults(query: string, results: string[]): Promise<string[]> {
  const prompt = `
Given the user query: "${query}" and the following retrieved documents:
${JSON.stringify(results)}
Please rank the documents in order of relevance (most relevant first).
Return only the ranked list as JSON (an array of strings).
`;
  try {
    const response = await generativeModel.generate(prompt);
    const ranked = JSON.parse(response.text);
    console.log("Ranked results:", ranked);
    return ranked;
  } catch (error) {
    console.error("Error re-ranking results:", error);
    return results;
  }
}

/**
 * Generate a final answer by summarizing the key points from the results.
 */
export async function generateFinalAnswer(query: string, results: string[]): Promise<string> {
  const prompt = `
You are a retrieval assistant.
Given the user query: "${query}"
and the following top retrieval results:
${JSON.stringify(results)}
Provide the best possible answer by summarizing the key points.
`;
  try {
    const response = await generativeModel.generate(prompt);
    console.log("Final answer generated:", response.text);
    return response.text.trim();
  } catch (error) {
    console.error("Error generating final answer:", error);
    return "";
  }
}
