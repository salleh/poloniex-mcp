import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { PoloniexClient } from "./poloniex/client.js";
import { registerTools } from "./tools.js";

/** Read the package version so the server reports a single source of truth. */
function readVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Construct a fully-wired MCP server: a Poloniex client backed by `config`,
 * with all tools registered. The caller connects it to a transport.
 */
export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "poloniex-mcp",
    version: readVersion(),
  });

  const client = new PoloniexClient(config);
  registerTools(server, client);

  return server;
}
