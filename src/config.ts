import { z } from "zod";

/**
 * Runtime configuration, validated at startup from environment variables.
 * Credentials are optional so the server can start and serve the public tools
 * without them; only `get_balances` requires them.
 */
const configSchema = z.object({
  apiKey: z.string().min(1).optional(),
  apiSecret: z.string().min(1).optional(),
  baseUrl: z.string().url(),
  timeoutMs: z.number().int().positive(),
});

export type Config = z.infer<typeof configSchema>;

const DEFAULT_BASE_URL = "https://api.poloniex.com";
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Build and validate configuration from the given environment (defaults to
 * `process.env`). Throws a ZodError with a clear message on invalid input.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse({
    apiKey: env.POLONIEX_API_KEY,
    apiSecret: env.POLONIEX_API_SECRET,
    baseUrl: env.POLONIEX_BASE_URL ?? DEFAULT_BASE_URL,
    timeoutMs: env.POLONIEX_TIMEOUT_MS
      ? Number(env.POLONIEX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS,
  });
}
