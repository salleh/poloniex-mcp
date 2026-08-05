import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import { toToolResult } from "./shared.js";

/** Register authenticated account tools. Require API credentials. */
export function registerAccountTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_balances",
    {
      title: "Get Balances",
      description:
        "Fetch authenticated account balances from Poloniex. Requires " +
        "POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.",
      inputSchema: {
        accountType: z
          .string()
          .optional()
          .describe(
            'Optional account type, e.g. "SPOT" (default) or "FUTURES".',
          ),
      },
    },
    async ({ accountType }) =>
      toToolResult(() =>
        client.getBalances({
          accountType: accountType
            ? accountType.trim().toUpperCase()
            : undefined,
        }),
      ),
  );
}
