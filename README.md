# Dokploy NATS

NATS server with JetStream, token auth, WebSocket, and HTTP monitoring as a single Dokploy Compose service.

## Architecture

```mermaid
flowchart LR
    apps[Apps / Clients]
    web[Browser / WS clients]
    admin([Operator])

    subgraph nats[NATS]
        srv[nats-server]
        js[(JetStream)]
        srv --> js
    end

    apps -->|TCP 4222| srv
    web -->|WSS via Traefik :8080| srv
    admin -->|HTTP :8222 monitoring| srv
```

## Setup in Dokploy

1. **Create Service → Compose**
   - Provider: Git
   - Repository: this repo (or your fork)
   - Branch: `main`
   - Compose path: `docker-compose.yml`

2. **Environment** — paste `.env.example` into the **Environment** tab and set a strong `NATS_AUTH_TOKEN`:

   ```bash
   openssl rand -hex 32
   ```

3. **Domains** — open the **Domains** tab and add each entry below.

   | Host                         | Path | Service | Container Port |
   | ---------------------------- | ---- | ------- | -------------- |
   | `nats-monitor.<your-domain>` | `/`  | `nats`  | `8222`         |
   | `nats-ws.<your-domain>`      | `/`  | `nats`  | `8080`         |
   - `nats-monitor` exposes `/healthz`, `/varz`, `/connz`, `/jsz`, etc.
   - `nats-ws` is the WebSocket endpoint (`wss://nats-ws.<your-domain>`).

4. **Protect the monitoring endpoint with basic auth** (Traefik middleware)

   **a. Generate a hashed credential**

   ```bash
   htpasswd -nb admin 'password'
   # → admin:$apr1$G3T3XOqn$6JGifVcvveyWFg7gYWZjH0
   ```

   **b. Create the middleware** in Dokploy: go to **Dokploy → Settings → Traefik** and open the dynamic config file editor. Add or append to `middlewares.yml`:

   ```yaml
   http:
     middlewares:
       nats-monitor-auth:
         basicAuth:
           users:
             - "admin:$apr1$G3T3XOqn$6JGifVcvveyWFg7gYWZjH0"
   ```

   **c. Attach it** to the `nats-monitor.<your-domain>` row in the service's **Domains** tab:

   ```
   nats-monitor-auth@file
   ```

5. **Native protocol (port 4222)** — Traefik routes HTTP, not raw TCP. To expose 4222 to outside clients, either:
   - Add `ports: ["4222:4222"]` to the `nats` service and open the firewall, or
   - Use the WebSocket endpoint from clients that support it.

## References

- [Node example](./examples/node) — Fastify UI + worker, request/reply, WebSocket live events, prefix-scoped subscriptions
