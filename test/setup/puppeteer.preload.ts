/**
 * Bun test preload: launches Puppeteer and exposes `page` / `browser` globals
 * (same contract as jest-puppeteer) before puppeteer test files are evaluated.
 */
import { afterAll } from "bun:test";
import puppeteer, { type Browser, type Page } from "puppeteer";
const launchOptions = {
  headless: true as const,
  defaultViewport: { width: 1280, height: 800 },
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
};

const browser: Browser = await puppeteer.launch(launchOptions);
const page: Page = await browser.newPage();

const g = globalThis as typeof globalThis & { browser: Browser; page: Page };
g.browser = browser;
g.page = page;

afterAll(async () => {
  await browser.close();
});
