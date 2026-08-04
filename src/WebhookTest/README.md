# Webhook Test

Reference for the **webhook-with-registration** demo. It exercises the full
Orchesty webhook lifecycle — subscribe, callback URL, delivery, unsubscribe —
without any real external provider, using the unified mock server in
`scripts/mock-server/`.

## Components

| Element | Type | What it does |
|-----|---|---|
| `WebhookTestApplication` (`webhook-test`) | Application (WEBHOOK) | Declares the subscribable events (`order.created`, `order.updated`, `ping`). Subscribe / unsubscribe target the mock server's `/webhooks/*` endpoints. |
| Webhook trigger | Topology node | Entry point of the `demo-webhook` topology (`shape: "circle"`, `label: "Webhook"`). The platform registers the callback URL against it and delivers inbound events here — no worker node is needed to receive them. |
| `AddTimestampNode` (`add-timestamp`) | Custom node | Enriches the delivered event payload with a `receivedAt` timestamp so you can watch it flow through the topology. |

## How it works

1. In the Orchesty UI you subscribe an event to the `demo-webhook` topology and
   its **Webhook trigger** node. The SDK builds a callback URL
   (`<starting-point>/topologies/<topology>/nodes/<node>/token/<token>/run`) and
   POSTs it to the mock server's `POST /webhooks/subscribe`.
2. The mock server stores the registration and, **every minute**, POSTs a test
   payload to that callback URL:

   ```json
   { "action": "order.created", "timestamp": "2026-07-21T12:00:00.000Z" }
   ```

3. The Orchesty starting-point routes the delivery into the topology, so the
   **Webhook trigger** fires once a minute and passes the payload downstream.
4. Unsubscribing in the UI calls `POST /webhooks/unsubscribe/:id`, which stops
   the timer.

> The callback URL must be reachable from wherever the mock server runs. With a
> cloud tenant (`TENANT_ID` set in `.env`) the starting-point is a public HTTPS
> URL, so a locally-run mock server can deliver to it.

## Running locally

```bash
# 1. Start the unified mock server (default port 3210).
npm run mock-server

# 2. In another terminal, start the worker.
npm run start

# 3. Import src/topologies/demo-webhook.tplg.json, then subscribe the event to it
#    from the Orchesty UI.
```

Handy mock-server endpoints while testing:

- `GET  /webhooks` — list active registrations
- `POST /webhooks/:id/trigger` — fire one delivery immediately (skip the wait)
- `POST /webhooks/unsubscribe/:id` — remove a registration

Delivery interval is configurable via `MOCK_WEBHOOK_INTERVAL_MS` (default
`60000`).

## Topology

`src/topologies/demo-webhook.tplg.json`:

```
[Webhook trigger] → [add-timestamp]
```

The Webhook trigger (`shape: "circle"`, `label: "Webhook"`) is the entry node the
callback URL targets; it forwards each delivered event to the shared
`add-timestamp` custom node so you can see the payload getting enriched.
