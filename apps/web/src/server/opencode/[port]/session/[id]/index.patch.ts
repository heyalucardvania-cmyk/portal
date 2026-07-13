import { z } from "zod/v4";
import { defineHandler } from "nitro/h3";
import { getOpencodeClient } from "../../../../lib/opencode-client";
import {
  parsePort,
  parseRouteParam,
  parseBody,
} from "../../../../lib/validation";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
});

export default defineHandler(async (event) => {
  const port = parsePort(event);
  const id = parseRouteParam(event, "id");
  const body = await parseBody(event, bodySchema);

  const client = getOpencodeClient(port);
  const result = await client.session.update({ sessionID: id, title: body.title });

  return result.data;
});
