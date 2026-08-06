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

/** Stub fetch with a 200 JSON response and return the mock for assertions. */
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

function requestHeaders(
  fetchMock: ReturnType<typeof vi.fn>,
): Record<string, string> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  return init.headers as Record<string, string>;
}

describe("authenticated account & wallet tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get_account_info signs a request to /accounts", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_account_info",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    expect(requestedUrl(fetchMock).pathname).toBe("/accounts");
    const headers = requestHeaders(fetchMock);
    expect(headers.key).toBe("test-key");
    expect(typeof headers.signature).toBe("string");
    expect(headers.signTimestamp).toMatch(/^\d+$/);
  });

  it("get_account_info errors without credentials", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: "get_account_info",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });

  it("get_account_activity forwards filters and normalizes currency", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_account_activity",
      arguments: {
        activityType: 205,
        currency: "usdt",
        startTime: 1000,
        endTime: 2000,
        limit: 50,
        from: 10,
        direction: "PRE",
      },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/accounts/activity");
    expect(url.searchParams.get("activityType")).toBe("205");
    expect(url.searchParams.get("currency")).toBe("USDT");
    expect(url.searchParams.get("startTime")).toBe("1000");
    expect(url.searchParams.get("endTime")).toBe("2000");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("from")).toBe("10");
    expect(url.searchParams.get("direction")).toBe("PRE");
  });

  it("get_account_activity omits params that were not supplied", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_account_activity", arguments: {} });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/accounts/activity");
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  it("get_account_activity rejects an unknown activityType", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_account_activity",
      arguments: { activityType: 999 },
    });

    expect(result.isError).toBe(true);
  });

  it("get_fee_info signs a request to /feeinfo", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_fee_info", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/feeinfo");
    expect(requestHeaders(fetchMock).key).toBe("test-key");
  });

  it("get_interest_history forwards pagination filters", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_interest_history",
      arguments: { limit: 25, direction: "NEXT", from: 5 },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/accounts/interest/history");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("direction")).toBe("NEXT");
    expect(url.searchParams.get("from")).toBe("5");
  });

  it("get_interest_history rejects a limit above the max", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_interest_history",
      arguments: { limit: 101 },
    });

    expect(result.isError).toBe(true);
  });

  it("get_transfer_records forwards currency and time window", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_transfer_records",
      arguments: { currency: "btc", startTime: 100, endTime: 200, limit: 30 },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/accounts/transfer");
    expect(url.searchParams.get("currency")).toBe("BTC");
    expect(url.searchParams.get("startTime")).toBe("100");
    expect(url.searchParams.get("endTime")).toBe("200");
    expect(url.searchParams.get("limit")).toBe("30");
  });

  it("get_deposit_addresses normalizes currency and signs the request", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_deposit_addresses",
      arguments: { currency: "usdt" },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/wallets/addresses");
    expect(url.searchParams.get("currency")).toBe("USDT");
    expect(requestHeaders(fetchMock).key).toBe("test-key");
  });

  it("get_deposit_addresses returns all currencies when none is given", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_deposit_addresses", arguments: {} });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/wallets/addresses");
    expect(url.searchParams.get("currency")).toBeNull();
  });

  it("get_wallet_activity forwards the required window and activityType", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_wallet_activity",
      arguments: { start: 1000, end: 2000, activityType: "deposits" },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/wallets/activity");
    expect(url.searchParams.get("start")).toBe("1000");
    expect(url.searchParams.get("end")).toBe("2000");
    expect(url.searchParams.get("activityType")).toBe("deposits");
  });

  it("get_wallet_activity accepts the adjustments activity type", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_wallet_activity",
      arguments: { start: 1000, end: 2000, activityType: "adjustments" },
    });

    expect(result.isError).toBeFalsy();
    expect(requestedUrl(fetchMock).searchParams.get("activityType")).toBe(
      "adjustments",
    );
  });

  it("get_wallet_activity rejects an unknown activity type", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_wallet_activity",
      arguments: { start: 1000, end: 2000, activityType: "trades" },
    });

    expect(result.isError).toBe(true);
  });

  it("get_wallet_activity requires start and end", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_wallet_activity",
      arguments: { start: 1000 },
    });

    expect(result.isError).toBe(true);
  });
});
