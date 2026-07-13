import { defineHandler } from "nitro/h3";
import { getOpencodeClient } from "../../lib/opencode-client";
import { parsePort } from "../../lib/validation";

export default defineHandler(async (event) => {
  const port = parsePort(event);
  const client = getOpencodeClient(port);
  const config = await client.config.get();
  const version =
    config.data && typeof config.data === "object" && "version" in config.data
      ? (config.data as Record<string, unknown>).version
      : undefined;

  return {
    healthy: !!config.data,
    port,
    ...(version ? { version: String(version) } : {}),
  };
});
