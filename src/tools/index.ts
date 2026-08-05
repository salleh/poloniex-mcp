import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import { registerMarketTools } from "./market.js";
import { registerAccountTools } from "./account.js";
import { registerOrdersTools } from "./orders.js";

/** Register all Poloniex tools on the given MCP server, grouped by domain. */
export function registerTools(server: McpServer, client: PoloniexClient): void {
  registerMarketTools(server, client);
  registerAccountTools(server, client);
  registerOrdersTools(server, client);
}
