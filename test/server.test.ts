import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { loadConfig } from "../src/config";

/** Spin up an in-memory client connected to the MCP server under test. */
async function connect(env: NodeJS.ProcessEnv = {}): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const server = createServer(loadConfig(env));
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);

  return client;
}

describe("MCP server", () => {
  it("lists the three expected tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_balances",
      "get_orderbook",
      "get_ticker",
    ]);
  });

  it("returns a clean tool error for get_balances without credentials", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: "get_balances",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });
});
