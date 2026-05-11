# Project rules

## Examples must mirror config

Whenever a NATS feature is added or changed in `nats.conf` or `docker-compose.yml`, add or update a corresponding sample under `examples/` (currently `examples/node/main.ts`).

The goal is that anyone reading the examples can see, end-to-end, every feature this deployment exposes — using env vars (`NATS_URL`, `NATS_AUTH_TOKEN`, …) so the same code runs locally and against Dokploy.

### Coverage checklist

- [x] Token auth — `connect({ token })`
- [x] Pub/sub on subject
- [x] JetStream — create stream, publish, ack
- [x] WebSocket connection (`ws://` locally, `wss://` in Dokploy) — see `examples/node/view/index.html`
- [x] Request/reply with streamed events (`jobs.create` → `{ executionId }`, then `executions.<id>.>`) — see `examples/node/worker.ts` + `examples/node/view/jobs.html`
- [ ] Add an entry here whenever a new feature lands in config (TLS / mTLS, NKey / JWT, accounts, KV, Object store, leaf nodes, cluster, …)

### When adding a sample

- Keep it minimal and runnable with `pnpm start` (or `npm start`).
- Read all credentials and URLs from env — never hardcode.
- If a new example dir is added (e.g. `examples/python`), mirror the same coverage there.
