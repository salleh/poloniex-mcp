import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import { toToolResult, normalizeCurrency, normalizeSymbol } from "./shared.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

/** Register authenticated margin read tools. Require API credentials. */
export function registerMarginTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_account_margin",
    {
      title: "Get Account Margin",
      description:
        "Fetch the account's margin information (equity, margin balance, " +
        "and available margin). " +
        AUTH_NOTE,
      inputSchema: {
        accountType: z
          .string()
          .optional()
          .describe(
            'Account type. Currently only "SPOT" is supported (default SPOT).',
          ),
      },
    },
    async ({ accountType }) =>
      toToolResult(() =>
        client.signedGet("/margin/accountMargin", {
          accountType: accountType ? accountType.trim().toUpperCase() : "SPOT",
        }),
      ),
  );

  server.registerTool(
    "get_borrow_status",
    {
      title: "Get Borrow Status",
      description:
        "Fetch the borrow status (borrowed amounts, rates, and available " +
        "amounts) for margin currencies. Omit `currency` for all. " +
        AUTH_NOTE,
      inputSchema: {
        currency: z
          .string()
          .optional()
          .describe('Filter by currency, e.g. "USDT". Omit for all.'),
      },
    },
    async ({ currency }) =>
      toToolResult(() => {
        const query: Query = {};
        if (currency) query.currency = normalizeCurrency(currency);
        return client.signedGet("/margin/borrowStatus", query);
      }),
  );

  server.registerTool(
    "get_max_size",
    {
      title: "Get Max Buy/Sell Size",
      description:
        "Fetch the maximum and available buy/sell amounts for a symbol on " +
        "margin. " +
        AUTH_NOTE,
      inputSchema: {
        symbol: z.string().describe('Symbol name, e.g. "BTC_USDT" (required).'),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        client.signedGet("/margin/maxSize", {
          symbol: normalizeSymbol(symbol),
        }),
      ),
  );
}
