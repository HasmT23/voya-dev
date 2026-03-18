import { chromium, type Browser, type BrowserContext } from "playwright";

let browser: Browser | null = null;
let context: BrowserContext | null = null;

/**
 * Launch or reuse a Chromium browser instance.
 * If the browser is already open, return the existing context.
 */
export async function getBrowserContext(): Promise<BrowserContext> {
  if (context && browser?.isConnected()) {
    return context;
  }

  // Launch a visible browser (not headless — user should see what's happening)
  browser = await chromium.launch({
    headless: false,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-infobars",
    ],
  });

  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  return context;
}

/**
 * Close the browser cleanly.
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
  }
}
