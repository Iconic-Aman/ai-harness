import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { BrowserSession } from "./browser.js";

export type Tool = {
  definition: ChatCompletionTool;
  execute: (args: Record<string, unknown>) => Promise<string>;
};

export type ToolRegistry = {
  definitions: ChatCompletionTool[];
  byName: Map<string, Tool>;
};

export type ToolHooks = {
  onUpvoteSuccess?: (storyId: string) => void;
  onStoriesLoaded?: (stories: any[]) => void;
};

export function createTools(session: BrowserSession, hooks?: ToolHooks): ToolRegistry {
  const tools: Tool[] = [

    {
      definition: {
        type: "function",
        function: {
          name: "browser_navigate",
          description: "Navigate the browser to a URL.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string" },
            },
            required: ["url"],
          },
        },
      },
      execute: async ({ url }) => session.navigate(url as string),
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_url",
          description: "Get the URL of the current page. Use this to detect redirects (e.g. being sent to a login page).",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      execute: async () => session.getUrl(),
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_get_text",
          description: "Get the visible text content of the current page.",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      execute: async () => session.getText(),
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_fill",
          description: "Fill in an input field on the current page.",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: 'CSS selector for the input, e.g. "input[name=\'acct\']"' },
              value: { type: "string", description: "The value to type into the field." },
            },
            required: ["selector", "value"],
          },
        },
      },
      execute: async ({ selector, value }) =>
        session.fill(selector as string, value as string),
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_click",
          description: "Click an element on the current page. Also waits for any navigation that results from the click.",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: 'CSS selector, e.g. "input[type=\'submit\']"' },
            },
            required: ["selector"],
          },
        },
      },
      execute: async ({ selector }) => {
        const result = await session.click(selector as string);
        // Check if this was a successful upvote click
        if (
          hooks?.onUpvoteSuccess &&
          /up_/.test(JSON.stringify(selector)) &&
          /news\.ycombinator\.com\/(news)?$/.test(result)
        ) {
          const match = (selector as string).match(/up_(\d+)/);
          if (match) {
            hooks.onUpvoteSuccess(match[1]);
          }
        }
        return result;
      },
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_get_stories",
          description: "Get a structured list of Hacker News stories on the current page — rank, story ID, title, and whether you've already voted. Use this instead of browser_get_text to accurately identify which story to upvote.",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      execute: async () => {
        const result = await session.getStories();
        if (hooks?.onStoriesLoaded) {
          try {
            const stories = JSON.parse(result);
            hooks.onStoriesLoaded(stories);
          } catch {}
        }
        return result;
      },
    },

    {
      definition: {
        type: "function",
        function: {
          name: "browser_has_class",
          description: "Check whether the first element matching a selector has a specific CSS class. Use this to verify upvote state: check if a[id='up_12345'] has class 'nosee' before and after clicking.",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector for the element to check." },
              className: { type: "string", description: "The CSS class name to look for." },
            },
            required: ["selector", "className"],
          },
        },
      },
      execute: async ({ selector, className }) =>
        session.hasClass(selector as string, className as string),
    },

  ];

  return {
    definitions: tools.map((t) => t.definition),
    byName: new Map(tools.map((t) => [t.definition.function.name, t])),
  };
}
