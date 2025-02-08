// scraper.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { chromium, Browser, Page } from "playwright";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { setTimeout } from "timers/promises";
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
}

export class AdvancedScraper {
  private browser: Browser | null = null;
  private concurrentLimit = 3;
  private activeScrapes = 0;
  // Stores the raw HTML (for debugging or later use)
  private zynthorvex: string = "";
  // Custom extraction rules (CSS selectors) supplied by the user.
  private customSelectors: string[] | null = null;

  // User-Agent rotation array.
  private userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  ];

  // Rate-limiting (simple in‑memory counter)
  private static requestCount = 0;
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;

  constructor(customSelectors?: string[]) {
    if (customSelectors) {
      this.customSelectors = customSelectors;
    }
    this.initBrowser();
    // Reset request count every minute.
    setInterval(() => {
      AdvancedScraper.requestCount = 0;
    }, 60 * 1000);
  }

  private async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }

  // Returns a new page while respecting the concurrent limit.
  private async getPage(): Promise<Page> {
    await this.initBrowser();
    while (this.activeScrapes >= this.concurrentLimit) {
      await setTimeout(100);
    }
    this.activeScrapes++;
    const page = await this.browser!.newPage();
    // Set a random User-Agent.
    const randomUserAgent =
      this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setExtraHTTPHeaders({ "User-Agent": randomUserAgent });
    return page;
  }

  private async releasePage() {
    this.activeScrapes--;
  }

  // Cleans and normalizes content.
  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, "\n")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }

  // Post-processing stub.
  private postProcessContent(content: string): string {
    return this.cleanContent(content);
  }

  // ===== Cheerio Scraping with Readability Fallback =====
  private async scrapeWithCheerio(url: string): Promise<ScrapingResult | null> {
    try {
      const randomUserAgent =
        this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": randomUserAgent },
      });
      // Save the raw HTML for later use.
      this.zynthorvex = data;
      const $ = cheerio.load(data);
      // Remove unwanted elements.
      $("script, style, nav, footer, header, aside, form, iframe, noscript, svg, .ad, .advertisement, .social-share").remove();

      // Use custom selectors if provided; otherwise, default ones.
      const selectors = this.customSelectors || [
        "article",
        '[role="main"]',
        "main",
        ".main-content",
        "#main-content",
        ".post-content",
        ".article-content",
        ".content",
      ];
      let content = "";
      for (const selector of selectors) {
        const element = $(selector);
        if (element.length) {
          content = element.text();
          break;
        }
      }
      if (!content || content.length < 500) {
        content = $("body").text();
      }
      content = this.postProcessContent(content);
      // If still too short, try Mozilla's Readability.
      if (content.length < 500) {
        const readabilityResult = this.scrapeWithReadability(data, url);
        if (readabilityResult) return readabilityResult;
      }
      return {
        content,
        metadata: {
          title: $("title").text() || "",
          description: $("meta[name='description']").attr("content") || "",
          timestamp: new Date().toISOString(),
          source: "cheerio",
        },
      };
    } catch (error) {
      console.error("Cheerio scraping failed:", error);
      return null;
    }
  }

  // Readability extraction via JSDOM & Readability.
  private scrapeWithReadability(html: string, url: string): ScrapingResult | null {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article && article.textContent && article.textContent.length > 0) {
        return {
          content: this.postProcessContent(article.textContent),
          metadata: {
            title: article.title || "",
            description: "",
            timestamp: new Date().toISOString(),
            source: "readability",
          },
        };
      }
    } catch (error) {
      console.error("Readability extraction failed:", error);
    }
    return null;
  }

  // ===== Playwright Scraping with Auto-Scrolling =====
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async scrapeWithPlaywright(url: string): Promise<ScrapingResult | null> {
    const page = await this.getPage();
    try {
      const startTime = Date.now();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("body", { timeout: 5000 });
      await this.autoScroll(page);

      const result = await page.evaluate((customSelectors) => {
        const removeSelectors = [
          "script", "style", "nav", "footer", "header", "aside", "form", "iframe", ".ad", ".advertisement", ".social-share",
        ];
        removeSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        });
        const selectors = (customSelectors && customSelectors.length > 0)
          ? customSelectors
          : [
              "article",
              '[role="main"]',
              "main",
              ".main-content",
              "#main-content",
              ".post-content",
              ".article-content",
              ".content",
            ];
        let content = "";
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            content = element.textContent || "";
            break;
          }
        }
        if (!content) {
          content = document.body.textContent || "";
        }
        return {
          content,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
        };
      }, this.customSelectors);

      const duration = Date.now() - startTime;
      console.log(`Playwright scrape duration: ${duration}ms`);

      return {
        content: this.postProcessContent(result.content),
        metadata: {
          title: result.title,
          description: result.description,
          timestamp: new Date().toISOString(),
          source: "playwright",
        },
      };
    } catch (error) {
      console.error("Playwright scraping failed:", error);
      return null;
    } finally {
      await page.close();
      this.releasePage();
    }
  }

  // ===== Combined Scraping =====
  async scrape(url: string): Promise<ScrapingResult | null> {
    if (AdvancedScraper.requestCount >= AdvancedScraper.MAX_REQUESTS_PER_MINUTE) {
      console.error("Rate limit exceeded");
      throw new Error("Rate limit exceeded");
    }
    AdvancedScraper.requestCount++;

    const startTime = Date.now();
    const cheerioResult = await this.scrapeWithCheerio(url);
    let finalResult: ScrapingResult | null = null;

    if (cheerioResult && cheerioResult.content.length > 1000) {
      finalResult = cheerioResult;
    } else {
      const playwrightResult = await this.scrapeWithPlaywright(url);
      if (cheerioResult && playwrightResult) {
        // Combine lines from both extractions.
        const combinedContent = new Set([
          ...cheerioResult.content.split("\n"),
          ...playwrightResult.content.split("\n"),
        ]);
        finalResult = {
          content: Array.from(combinedContent).join("\n"),
          metadata: {
            title: cheerioResult.metadata.title || playwrightResult.metadata.title,
            description: cheerioResult.metadata.description || playwrightResult.metadata.description,
            timestamp: new Date().toISOString(),
            source: "combined",
          },
        };
      } else {
        finalResult = playwrightResult || cheerioResult;
      }
    }

    console.log("Scraped content length:", finalResult?.content.length);
    console.log("Scraped content:", finalResult?.content);

    const totalDuration = Date.now() - startTime;
    console.log(`Total scrape duration: ${totalDuration}ms`);

    // Cache functionality removed

    return finalResult;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
