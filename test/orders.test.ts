import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { loadConfig } from "../src/config";

type TextContent = Array<{ type: string; text: string }>;

const AUTH_ENV = {
  POLONIEX_API_KEY: "test-key",
  POLONIEX_API_SECRET: "test-secret",
};

async function connect(env: NodeJS.ProcessEnv = {}): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer(loadConfig(env));
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

function stubFetch(body: unknown = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return fetchMock.mock.calls[0]?.[0] as URL;
}

describe("authenticated order & smart-order tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get_order looks up by order id", async () => {
    const fetchMock = stubFetch({ id: "42" });
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_order",
      arguments: { id: "42" },
    });

    expect(result.isError).toBeFalsy();
    expect(requestedUrl(fetchMock).pathname).toBe("/orders/42");
  });

  it("get_order looks up by client order id via cid: prefix", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_order",
      arguments: { clientOrderId: "my-123" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/orders/cid:my-123");
  });

  it("get_order errors when neither id nor clientOrderId is given", async () => {
    const client = await connect(AUTH_ENV);
    const result = await client.callTool({ name: "get_order", arguments: {} });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/id or a clientOrderId/);
  });

  it("get_order errors when both id and clientOrderId are given", async () => {
    const client = await connect(AUTH_ENV);
    const result = await client.callTool({
      name: "get_order",
      arguments: { id: "42", clientOrderId: "my-123" },
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/not both/);
  });

  it("get_order errors without credentials", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: "get_order",
      arguments: { id: "42" },
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });

  it("get_orders_history forwards filters and normalizes symbol", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_orders_history",
      arguments: {
        symbol: "btc_usdt",
        type: "LIMIT",
        side: "SELL",
        states: "FILLED,CANCELED",
        hideCancel: true,
        limit: 20,
      },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/orders/history");
    expect(url.searchParams.get("symbol")).toBe("BTC_USDT");
    expect(url.searchParams.get("type")).toBe("LIMIT");
    expect(url.searchParams.get("side")).toBe("SELL");
    expect(url.searchParams.get("states")).toBe("FILLED,CANCELED");
    expect(url.searchParams.get("hideCancel")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("get_order_trades targets the order's trades endpoint", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_order_trades",
      arguments: { id: "42" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/orders/42/trades");
  });

  it("get_trade_history forwards symbols, limit, and window", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_trade_history",
      arguments: {
        symbols: "btc_usdt,eth_usdt",
        limit: 50,
        startTime: 100,
        endTime: 200,
      },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/trades");
    expect(url.searchParams.get("symbols")).toBe("BTC_USDT,ETH_USDT");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("startTime")).toBe("100");
    expect(url.searchParams.get("endTime")).toBe("200");
  });

  it("get_trade_history rejects a limit above the max", async () => {
    const client = await connect(AUTH_ENV);
    const result = await client.callTool({
      name: "get_trade_history",
      arguments: { limit: 1001 },
    });

    expect(result.isError).toBe(true);
  });

  it("get_kill_switch_status targets the kill switch status endpoint", async () => {
    const fetchMock = stubFetch({ startTime: "0" });
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_kill_switch_status", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/orders/killSwitchStatus");
  });

  it("get_smart_open_orders forwards filters", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_smart_open_orders",
      arguments: { symbol: "btc_usdt", side: "BUY", limit: 10 },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/smartorders");
    expect(url.searchParams.get("symbol")).toBe("BTC_USDT");
    expect(url.searchParams.get("side")).toBe("BUY");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("get_smart_order looks up by client order id via cid: prefix", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_smart_order",
      arguments: { clientOrderId: "sc-9" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/smartorders/cid:sc-9");
  });

  it("get_smart_orders_history targets the smart history endpoint", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_smart_orders_history",
      arguments: { symbol: "btc_usdt" },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/smartorders/history");
    expect(url.searchParams.get("symbol")).toBe("BTC_USDT");
  });
});
