import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { connect, JSONCodec } from "nats";

const natsUrl = process.env.NATS_URL ?? "nats://localhost:4222";
const natsToken = process.env.NATS_AUTH_TOKEN;
const port = Number(process.env.PORT ?? 4000);

const nc = await connect({ servers: natsUrl, token: natsToken });
console.log(`fastify connected to NATS at ${nc.getServer()}`);

const jc = JSONCodec<Record<string, unknown>>();

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const viewsDir = join(dirname(fileURLToPath(import.meta.url)), "views");
const indexHtml = await readFile(join(viewsDir, "index.html"), "utf8");
const appJs = await readFile(join(viewsDir, "app.js"), "utf8");

app.get("/", async (_req, reply) => {
  reply.type("text/html");
  return indexHtml;
});

app.get("/app.js", async (_req, reply) => {
  reply.type("application/javascript");
  return appJs;
});

app.post("/api", async (req, reply) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  try {
    const res = await nc.request("jobs.create", jc.encode(body), {
      timeout: 3000,
    });
    return jc.decode(res.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reply.code(502);
    return { error: "worker unavailable", detail: message };
  }
});

app.get("/healthz", async () => ({ ok: true, nats: nc.getServer() }));

await app.listen({ host: "0.0.0.0", port });

const shutdown = async () => {
  await app.close();
  await nc.drain();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
