// main.ts
import { AdvancedScraper } from "./scraping";
import { processTextToEmbeddings } from "./chunking";
import { uploadToPinecone } from "./pineconedb";
import md5 from "md5";
import dotenv from "dotenv";
dotenv.config();

/**
 * scrapedContent - Scrapes a URL, processes the text into chunks and embeddings,
 * and uploads the resulting vectors to Pinecone. Returns the scraped content.
 *
 * @param url - The URL to process.
 * @returns The scraped content.
 */
async function scrapedContent(url: string): Promise<string | void> {
  const scraper = new AdvancedScraper();
  
  // Scrape the page content.
  const finalResult = await scraper.scrape(url);
  if (!finalResult) {
    console.error("No content scraped from the URL.");
    await scraper.close();
    return;
  }
  
  if (!finalResult.content) {
    console.error("Scraped content is empty.");
    await scraper.close();
    return;
  }
  
  console.log("Scraped content length:", finalResult.content.length);
  console.log("Scraped content:", finalResult.content);
  
  // Process the scraped content into chunks, embeddings, and an aggregated embedding.
  const { chunks, chunkEmbeddings } = await processTextToEmbeddings(finalResult.content);
  console.log("Final Chunks:", chunks);
  console.log("Chunk Embeddings:", chunkEmbeddings);
  // console.log("Aggregated Embedding:", aggregatedEmbedding);
  
  // Create Pinecone vector records from the chunks.
  const vectors = chunks.map((chunk, index) => ({
    id: md5(chunk.text),
    values: chunkEmbeddings[index],
    metadata: {
      text: chunk.text,
      startIndex: chunk.metadata.startIndex,
      endIndex: chunk.metadata.endIndex,
      title: finalResult.metadata.title,
      description: finalResult.metadata.description,
      source: finalResult.metadata.source,
      timestamp: finalResult.metadata.timestamp,
    }
  }));
  
  const namespace = url; // or use another namespace based on your requirements
  console.log("Uploading embeddings to Pinecone...");
  await uploadToPinecone(vectors, namespace);
  console.log("Processing and uploading complete.");
  
  await scraper.close();
  return finalResult.content;
}

// If the script is run directly, read the URL from command-line arguments.
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide a URL as an argument.");
    process.exit(1);
  }
  scrapedContent(url)
    .then(content => {
      if (content) {
        console.log("Final scraped content returned.");
      }
    })
    .catch(err => console.error(err));
}

export { scrapedContent };
