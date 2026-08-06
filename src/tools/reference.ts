import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import { toToolResult, normalizeSymbol, normalizeCurrency } from "./shared.js";

/** Register public reference-data tools (no credentials required). */
export function registerReferenceTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_symbols",
    {
      title: "Get Symbols",
      description:
        "Fetch trading symbols and their trade-limit information. Omit `symbol` " +
        "for all symbols, or pass one for a single market. Public — no " +
        "credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe(
            'Trading pair, e.g. "BTC_USDT". Omit to return all symbols.',
          ),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        client.get(symbol ? `/markets/${normalizeSymbol(symbol)}` : "/markets"),
      ),
  );

  server.registerTool(
    "get_currencies",
    {
      title: "Get Currencies",
      description:
        "Fetch supported currencies and their chain/network details. Omit " +
        "`currency` for all currencies. Set `v2` for the v2 response format. " +
        "Public — no credentials required.",
      inputSchema: {
        currency: z
          .string()
          .optional()
          .describe('Currency code, e.g. "USDT". Omit to return all.'),
        v2: z
          .boolean()
          .optional()
          .describe("Use the v2 currencies endpoint (/v2/currencies)."),
        includeMultiChainCurrencies: z
          .boolean()
          .optional()
          .describe("Include multi-chain currencies (v1 only, default false)."),
      },
    },
    async ({ currency, v2, includeMultiChainCurrencies }) =>
      toToolResult(() => {
        const code = currency ? normalizeCurrency(currency) : undefined;
        if (v2) {
          return client.get(code ? `/v2/currencies/${code}` : "/v2/currencies");
        }
        const query: Query = {};
        if (includeMultiChainCurrencies !== undefined) {
          query.includeMultiChainCurrencies = String(
            includeMultiChainCurrencies,
          );
        }
        return client.get(code ? `/currencies/${code}` : "/currencies", query);
      }),
  );

  server.registerTool(
    "get_timestamp",
    {
      title: "Get Server Timestamp",
      description:
        "Fetch the current Poloniex server time. Public — no credentials " +
        "required.",
      inputSchema: {},
    },
    async () => toToolResult(() => client.get("/timestamp")),
  );
}
