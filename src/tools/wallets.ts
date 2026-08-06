import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import { toToolResult, normalizeCurrency } from "./shared.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

/** Register authenticated wallet read tools. Require API credentials. */
export function registerWalletsTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_deposit_addresses",
    {
      title: "Get Deposit Addresses",
      description:
        "Fetch deposit addresses for the account. Omit `currency` for all " +
        "currencies, or pass one for a single currency. " +
        AUTH_NOTE,
      inputSchema: {
        currency: z
          .string()
          .optional()
          .describe('Currency code, e.g. "USDT". Omit to return all.'),
      },
    },
    async ({ currency }) =>
      toToolResult(() => {
        const query: Query = {};
        if (currency) query.currency = normalizeCurrency(currency);
        return client.signedGet("/wallets/addresses", query);
      }),
  );

  server.registerTool(
    "get_wallet_activity",
    {
      title: "Get Wallet Activity",
      description:
        "Fetch deposit and withdrawal activity within a time window. Both " +
        "`start` and `end` are required. " +
        AUTH_NOTE,
      inputSchema: {
        start: z
          .number()
          .int()
          .nonnegative()
          .describe("Start of the window, as a UNIX timestamp (required)."),
        end: z
          .number()
          .int()
          .nonnegative()
          .describe("End of the window, as a UNIX timestamp (required)."),
        activityType: z
          .enum(["adjustments", "deposits", "withdrawals"])
          .optional()
          .describe("Filter by activity type. Omit for all types."),
      },
    },
    async ({ start, end, activityType }) =>
      toToolResult(() => {
        const query: Query = { start, end };
        if (activityType) query.activityType = activityType;
        return client.signedGet("/wallets/activity", query);
      }),
  );
}
