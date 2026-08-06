import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeCurrency,
  buildActivityQuery,
  ACCOUNT_ACTIVITY_TYPES,
  MAX_ACCOUNT_ACTIVITY_LIMIT,
  MAX_INTEREST_HISTORY_LIMIT,
  MAX_TRANSFER_RECORDS_LIMIT,
} from "./shared.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

/** Zod schema for the PRE/NEXT pagination direction. */
const directionSchema = z
  .enum(["PRE", "NEXT"])
  .optional()
  .describe("Pagination direction relative to `from` (default NEXT).");

/** Zod schema for an epoch-millisecond time filter. */
const timeMsSchema = z.number().int().nonnegative().optional();

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
        "Fetch authenticated account balances from Poloniex. " + AUTH_NOTE,
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

  server.registerTool(
    "get_account_info",
    {
      title: "Get Account Info",
      description:
        "Fetch account information (ids, types, and state) for all of the " +
        "caller's accounts. " +
        AUTH_NOTE,
      inputSchema: {},
    },
    async () => toToolResult(() => client.signedGet("/accounts")),
  );

  server.registerTool(
    "get_account_activity",
    {
      title: "Get Account Activity",
      description:
        "Fetch account activity such as airdrops, rebates, staking, and " +
        "adjustments, with optional filters. " +
        AUTH_NOTE,
      inputSchema: {
        activityType: z
          .number()
          .int()
          .refine(
            (v) => (ACCOUNT_ACTIVITY_TYPES as readonly number[]).includes(v),
            { message: "Unknown activityType code." },
          )
          .optional()
          .describe(
            "Activity type code, e.g. 200 (ALL), 201 (AIRDROP), 205 (SWAP).",
          ),
        currency: z
          .string()
          .optional()
          .describe('Filter by currency, e.g. "USDT". Omit for all.'),
        startTime: timeMsSchema.describe("Start time in epoch milliseconds."),
        endTime: timeMsSchema.describe("End time in epoch milliseconds."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_ACCOUNT_ACTIVITY_LIMIT)
          .optional()
          .describe("Number of records to return (default 100, max 1000)."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Record id to start the query from (default 0)."),
        direction: directionSchema,
      },
    },
    async ({
      activityType,
      currency,
      startTime,
      endTime,
      limit,
      from,
      direction,
    }) =>
      toToolResult(() =>
        client.signedGet(
          "/accounts/activity",
          buildActivityQuery({
            activityType,
            currency: currency ? normalizeCurrency(currency) : undefined,
            startTime,
            endTime,
            limit,
            from,
            direction,
          }),
        ),
      ),
  );

  server.registerTool(
    "get_fee_info",
    {
      title: "Get Fee Info",
      description:
        "Fetch the caller's trading fee rates and related fee information. " +
        AUTH_NOTE,
      inputSchema: {},
    },
    async () => toToolResult(() => client.signedGet("/feeinfo")),
  );

  server.registerTool(
    "get_interest_history",
    {
      title: "Get Interest History",
      description:
        "Fetch the account's interest history (margin/lending). " + AUTH_NOTE,
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_INTEREST_HISTORY_LIMIT)
          .optional()
          .describe("Number of records to return (default 10, max 100)."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Record id to start the query from (default 0)."),
        direction: directionSchema,
        startTime: timeMsSchema.describe("Start time in epoch milliseconds."),
        endTime: timeMsSchema.describe("End time in epoch milliseconds."),
      },
    },
    async ({ limit, from, direction, startTime, endTime }) =>
      toToolResult(() =>
        client.signedGet(
          "/accounts/interest/history",
          buildActivityQuery({ limit, from, direction, startTime, endTime }),
        ),
      ),
  );

  server.registerTool(
    "get_transfer_records",
    {
      title: "Get Transfer Records",
      description:
        "Fetch records of transfers between the caller's accounts (e.g. spot " +
        "<-> futures), with optional filters. " +
        AUTH_NOTE,
      inputSchema: {
        currency: z
          .string()
          .optional()
          .describe('Filter by currency, e.g. "USDT". Omit for all.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_TRANSFER_RECORDS_LIMIT)
          .optional()
          .describe("Number of records to return (default 100, max 1000)."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Transfer id to start the query from (default 0)."),
        direction: directionSchema,
        startTime: timeMsSchema.describe("Start time in epoch milliseconds."),
        endTime: timeMsSchema.describe("End time in epoch milliseconds."),
      },
    },
    async ({ currency, limit, from, direction, startTime, endTime }) =>
      toToolResult(() =>
        client.signedGet(
          "/accounts/transfer",
          buildActivityQuery({
            currency: currency ? normalizeCurrency(currency) : undefined,
            limit,
            from,
            direction,
            startTime,
            endTime,
          }),
        ),
      ),
  );
}
