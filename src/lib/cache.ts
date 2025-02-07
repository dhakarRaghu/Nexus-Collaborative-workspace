// lib/cache.ts
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export interface ScrapingResult {
  content: string;
  metadata: {
    title: string;
    description: string;
    timestamp: string;
    source: "cheerio" | "playwright" | "readability" | "combined";
  };
  embedding?: any;
}

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

export async function getFromCache(url: string): Promise<ScrapingResult | null> {
  try {
    const cached = await redis.get(url);
    if (cached) {
      return JSON.parse(cached) as ScrapingResult;
    }
  } catch (error) {
    console.error("Error retrieving from cache:", error);
  }
  return null;
}

export async function storeInCache(url: string, result: ScrapingResult): Promise<void> {
  try {
    await redis.set(url, JSON.stringify(result), "EX", CACHE_EXPIRATION_SECONDS);
  } catch (error) {
    console.error("Error storing to cache:", error);
  }
}
