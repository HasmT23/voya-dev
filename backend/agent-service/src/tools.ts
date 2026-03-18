import type Anthropic from "@anthropic-ai/sdk";

/**
 * Pre-defined tool whitelist for Voya browser automation.
 * Claude can ONLY call these tools — no arbitrary code execution.
 */
export const BROWSER_TOOLS: Anthropic.Tool[] = [
  {
    name: "navigate",
    description: "Navigate the browser to a specific URL.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "search",
    description: "Type text into a search box and submit. Used for searching on YouTube, Google, Notion, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: {
          type: "string",
          enum: ["youtube", "google", "notion"],
          description: "Which platform to search on.",
        },
        query: {
          type: "string",
          description: "The search query text.",
        },
      },
      required: ["platform", "query"],
    },
  },
  {
    name: "click",
    description: "Click on an element identified by a CSS selector or text content.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the element to click.",
        },
        text: {
          type: "string",
          description: "Visible text content to find and click.",
        },
      },
    },
  },
  {
    name: "type_text",
    description: "Type text into an input field.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the input field.",
        },
        text: {
          type: "string",
          description: "The text to type.",
        },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "wait",
    description: "Wait for an element to appear on the page or wait a fixed time.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to wait for.",
        },
        timeout: {
          type: "number",
          description: "Max wait time in milliseconds (default 5000, max 10000).",
        },
      },
    },
  },
  {
    name: "read_page",
    description: "Read visible text content from the current page to understand what's displayed.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Optional CSS selector to read specific section. If omitted, reads main content.",
        },
      },
    },
  },
  {
    name: "youtube_add_to_playlist",
    description: "Add the current YouTube video to a playlist by name. Creates the playlist if it doesn't exist.",
    input_schema: {
      type: "object" as const,
      properties: {
        playlistName: {
          type: "string",
          description: "Name of the playlist to add the video to.",
        },
      },
      required: ["playlistName"],
    },
  },
  {
    name: "notion_create_page",
    description: "Create a new page in Notion with specified title and content.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Page title.",
        },
        content: {
          type: "string",
          description: "Page content in plain text.",
        },
        parentPage: {
          type: "string",
          description: "Optional parent page name to nest under.",
        },
      },
      required: ["title"],
    },
  },
];

/**
 * Maximum steps per command to prevent runaway execution.
 */
export const MAX_STEPS = 10;
