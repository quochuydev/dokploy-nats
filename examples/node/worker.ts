import { connect, JSONCodec } from "nats";
import { v7 as uuidv7 } from "uuid";

const url = process.env.NATS_URL ?? "nats://localhost:4222";
const token = process.env.NATS_AUTH_TOKEN;
const nc = await connect({ servers: url, token });
console.log(`worker connected to ${nc.getServer()}`);

const jc = JSONCodec<Record<string, unknown>>();
const sub = nc.subscribe("jobs.create", { queue: "workers" });
console.log("listening on jobs.create");

for await (const m of sub) {
  const req = (() => {
    try {
      return jc.decode(m.data);
    } catch {
      return {};
    }
  })();
  const prefix =
    typeof req.prefix === "string" && req.prefix ? req.prefix : "default";
  const executionId = uuidv7();
  m.respond(jc.encode({ executionId, prefix }));
  console.log(`[worker] ${prefix}/${executionId} <- ${JSON.stringify(req)}`);

  (async () => {
    const steps = ["queued", "running", "succeeded"] as const;
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      nc.publish(
        `executions.${prefix}.${executionId}.event`,
        jc.encode({
          executionId,
          prefix,
          seq: i + 1,
          status: steps[i],
          message: `step ${i + 1}/${steps.length}`,
          at: new Date().toISOString(),
        }),
      );
    }
  })();
}
