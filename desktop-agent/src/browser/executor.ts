import type { BrowserContext, Page } from "playwright";
import { getBrowserContext } from "../launcher/browser.js";

interface ActionStep {
  stepIndex: number;
  action: string;
  params: Record<string, unknown>;
}

interface StepResult {
  stepIndex: number;
  status: "completed" | "failed";
  result?: string;
  error?: string;
}

/**
 * Allowed domains — the agent can only navigate to these.
 */
const ALLOWED_DOMAINS = [
  "youtube.com",
  "www.youtube.com",
  "google.com",
  "www.google.com",
  "notion.so",
  "www.notion.so",
];

function isAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

/**
 * Execute an action plan step by step.
 * Reports results for each step via the callback.
 */
export async function executePlan(
  steps: ActionStep[],
  onStepUpdate: (result: StepResult) => void
): Promise<void> {
  const ctx = await getBrowserContext();
  let page: Page;

  const pages = ctx.pages();
  if (pages.length > 0) {
    page = pages[0];
  } else {
    page = await ctx.newPage();
  }

  for (const step of steps) {
    try {
      const result = await executeStep(page, step);
      onStepUpdate({
        stepIndex: step.stepIndex,
        status: "completed",
        result,
      });
    } catch (err) {
      onStepUpdate({
        stepIndex: step.stepIndex,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      // Stop execution on failure
      break;
    }
  }
}

async function executeStep(page: Page, step: ActionStep): Promise<string> {
  const { action, params } = step;

  switch (action) {
    case "navigate": {
      const url = params.url as string;
      if (!isAllowedUrl(url)) {
        throw new Error(`Navigation blocked: ${url} is not an allowed domain.`);
      }
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return `Navigated to ${url}`;
    }

    case "search": {
      const platform = params.platform as string;
      const query = params.query as string;

      if (platform === "youtube") {
        await page.goto("https://www.youtube.com", {
          waitUntil: "domcontentloaded",
        });
        await page.fill('input[name="search_query"]', query);
        await page.keyboard.press("Enter");
        await page.waitForLoadState("domcontentloaded");
      } else if (platform === "google") {
        await page.goto("https://www.google.com", {
          waitUntil: "domcontentloaded",
        });
        await page.fill('textarea[name="q"]', query);
        await page.keyboard.press("Enter");
        await page.waitForLoadState("domcontentloaded");
      } else if (platform === "notion") {
        await page.goto("https://www.notion.so", {
          waitUntil: "domcontentloaded",
        });
        await page.keyboard.press("Control+k");
        await page.waitForTimeout(500);
        await page.keyboard.type(query);
      }

      return `Searched for "${query}" on ${platform}`;
    }

    case "click": {
      if (params.text) {
        await page.getByText(params.text as string, { exact: false }).first().click();
        return `Clicked element with text "${params.text}"`;
      } else if (params.selector) {
        await page.click(params.selector as string);
        return `Clicked element: ${params.selector}`;
      }
      throw new Error("Click requires either text or selector.");
    }

    case "type_text": {
      const selector = params.selector as string;
      const text = params.text as string;
      await page.fill(selector, text);
      return `Typed "${text}" into ${selector}`;
    }

    case "wait": {
      const timeout = Math.min((params.timeout as number) || 5000, 10000);
      if (params.selector) {
        await page.waitForSelector(params.selector as string, { timeout });
        return `Found element: ${params.selector}`;
      }
      await page.waitForTimeout(timeout);
      return `Waited ${timeout}ms`;
    }

    case "read_page": {
      const selector = (params.selector as string) || "body";
      const text = await page.locator(selector).first().textContent();
      // Truncate to prevent massive payloads
      const truncated = (text || "").slice(0, 500);
      return truncated;
    }

    case "youtube_add_to_playlist": {
      const playlistName = params.playlistName as string;
      // Click the "Save" button under the video
      await page.click('button[aria-label="Save to playlist"]');
      await page.waitForTimeout(1000);

      // Check if playlist exists
      const playlistItem = page.getByText(playlistName, { exact: true });
      if ((await playlistItem.count()) > 0) {
        await playlistItem.click();
      } else {
        // Create new playlist
        await page.click("text=Create new playlist");
        await page.waitForTimeout(500);
        await page.fill('input[placeholder="Enter playlist name..."]', playlistName);
        await page.click("text=Create");
      }

      await page.waitForTimeout(500);
      return `Added video to playlist "${playlistName}"`;
    }

    case "notion_create_page": {
      const title = params.title as string;
      await page.goto("https://www.notion.so", {
        waitUntil: "domcontentloaded",
      });
      // Create new page via keyboard shortcut
      await page.keyboard.press("Control+n");
      await page.waitForTimeout(1000);
      await page.keyboard.type(title);
      await page.keyboard.press("Enter");

      if (params.content) {
        await page.keyboard.type(params.content as string);
      }

      return `Created Notion page: "${title}"`;
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
