import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { loadConfig } from "../src/config";

type TextContent = Array<{ type: string; text: string }>;

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the four expected tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_balances",
      "get_open_orders",
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
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });

  it("get_ticker returns ticker data via the tool (symbol normalized)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ symbol: "BTC_USDT", close: "64000" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = await connect();
    const result = await client.callTool({
      name: "get_ticker",
      arguments: { symbol: "btc_usdt" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as TextContent;
    expect(content[0]?.text).toContain("BTC_USDT");
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.pathname).toBe("/markets/BTC_USDT/ticker24h");
  });

  it("get_orderbook returns depth via the tool with the default limit", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ bids: [], asks: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = await connect();
    const result = await client.callTool({
      name: "get_orderbook",
      arguments: { symbol: "BTC_USDT" },
    });

    expect(result.isError).toBeFalsy();
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.pathname).toBe("/markets/BTC_USDT/orderBook");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("get_open_orders errors without credentials", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: "get_open_orders",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });

  it("get_open_orders sends a signed request with filters", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = await connect({
      POLONIEX_API_KEY: "test-key",
      POLONIEX_API_SECRET: "test-secret",
    });
    const result = await client.callTool({
      name: "get_open_orders",
      arguments: { symbol: "btc_usdt", side: "BUY", limit: 50 },
    });

    expect(result.isError).toBeFalsy();
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.pathname).toBe("/orders");
    expect(url.searchParams.get("symbol")).toBe("BTC_USDT");
    expect(url.searchParams.get("side")).toBe("BUY");
    expect(url.searchParams.get("limit")).toBe("50");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.key).toBe("test-key");
    expect(typeof headers.signature).toBe("string");
  });
});
