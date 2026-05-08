import { connect, StringCodec, JSONCodec } from "nats";

const url = process.env.NATS_URL ?? "nats://localhost:4222";
const token = process.env.NATS_AUTH_TOKEN;

const nc = await connect({ servers: url, token });
console.log(`connected to ${nc.getServer()}`);

const sc = StringCodec();
const jc = JSONCodec();

const sub = nc.subscribe("demo.>");
(async () => {
  for await (const m of sub) {
    console.log(`[sub] ${m.subject}: ${sc.decode(m.data)}`);
  }
})();

nc.publish("demo.hello", sc.encode("hello from tsx"));
await nc.flush();

const jsm = await nc.jetstreamManager();
await jsm.streams.add({ name: "EVENTS", subjects: ["events.>"] }).catch(() => {});

const js = nc.jetstream();
const ack = await js.publish("events.user.signup", jc.encode({ id: "u1" }));
console.log(`[js] stream=${ack.stream} seq=${ack.seq}`);

await new Promise((r) => setTimeout(r, 500));
await nc.drain();
