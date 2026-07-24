# Products Test Bulk-Sync Load Test

A rig for testing a **regular connector** and a **batch with pagination**
against a configurable catalog of **synthetic** products. This is a
**simulation** — not a real Magento integration. It pairs with the unified mock
server in `scripts/mock-server/` (which serves a Magento 2 REST-shaped payload).

## Components

| Element | Type | What it does |
|-----|---|---|
| `ProductsTestApplication` (`products-test`) | Application | Holds `baseUrl` (default `http://localhost:3210`) and an optional bearer token. Defaults aim at the unified mock server. |
| `ProductsTestGetProduct` (`products-test-get-product`) | Connector | Fetches a single product via `GET /api/products/:id`. The "regular connector" demo. |
| `ProductsTestListProductsBatch` (`products-test-list-products-batch`) | Batch | Pages through `GET /rest/V1/products`, emits each product as its own message. Cursor = `currentPage`. |
| `ProductsTestProductMapper` (`products-test-product-mapper`) | CustomNode | Reshapes the source product into a simpler target shape. Last node in the bulk-sync topology. |
| `ProductsTestExtractId` (`products-test-extract-id`) | CustomNode | Trims a listed product to `{ id }` for the GET connector. Backs the limiter test topology. |

## Running locally

```bash
# 1. Start the unified mock server (port 3210, 100 products by default).
npm run mock-server

# 2. In another terminal, start the worker as usual.
npm run start
```

The catalog is intentionally small (100 products, pages of 10) so the demo
never floods the platform. Override with `MOCK_SERVER_TOTAL_COUNT` /
`MOCK_SERVER_MAX_PAGE_SIZE` only if you know you have the capacity.

The mock exposes (product surfaces):

- `GET  /api/products/:id` — single product (regular connector)
- `GET  /rest/V1/products?searchCriteria[currentPage]=N&searchCriteria[pageSize]=M` — page (batch)
- `GET  /health`

Optional chaos params on the list request URL:

- `?fail=0.05` — 5 % of responses return HTTP 500
- `?latency=200` — server delays each response by 200 ms

## Topologies

Both reference topologies live in the shared topologies folder `src/topologies/`.

**Regular connector** — `demo-get-product.tplg.json`:

```
[start] → [products-test-get-product]
```

Provide `{ "id": 1 }` as the start payload; the connector returns that single
product. Attach a breakpoint after it to inspect the output.

**Batch with pagination** — `demo-products-test-bulk-sync.tplg.json`:

```
[cron] → [products-test-list-products-batch] → [products-test-product-mapper]
```

The mapper is the last node — attach a breakpoint after it to inspect the
mapped output.

The batch node accepts the following input on `cron` payload (or first
manual run):

```json
{
  "pageSize": 10,
  "maxProducts": 100,
  "failRate": 0,
  "latencyMs": 0
}
```

`pageSize` is capped at 10 and the mock serves at most 100 products, so a full
run fans out ≤ 100 messages. Set `maxProducts` even lower (e.g. `20`) for a
quick smoke test. `failRate` / `latencyMs` are forwarded to the mock for chaos
testing.

**Limiter test** — `demo-limiter.tplg.json`:

```
[cron] → [products-test-list-products-batch] → [products-test-extract-id] → [products-test-get-product]
```

The batch fans out one message per product; `products-test-extract-id` trims
each to `{ id }` and the GET connector re-fetches each product by id.

The throttling is done by the **application-level limiter**, not by any node in
the worker. Configure it in the Orchesty UI on the `products-test` application
(Authorization and settings → Limiter tab): enable the limit and set the rate
(e.g. 10 requests / 60 s). The platform then applies that limiter to every
app-bound node automatically, including `products-test-get-product` after the
batch fan-out, so the surplus messages sit in `LIMIT_OVERFLOW` and drain over
time. With 100 products and 10/min you get a clear, observable throttle.

> Do **not** call `dto.setLimiter()` inside `products-test-extract-id`. It writes
> the same `limiter-key` header the platform uses for the app-level limiter, so a
> custom key there overwrites (and effectively disables) the app limiter on the
> downstream connector. Leave the mapper limiter-free and let the app handle it.

> **Careful with breakpoints:** a breakpoint after a node retains every message
> for inspection. That's fine at ≤ 100, but if you raise the mock catalog size,
> drop the breakpoint (or lower `maxProducts`) to avoid flooding the platform.

## Capacity expectations

- The fan-out is one message per product. With the default 100-product catalog
  a full run stays well within a standard message-in-flight budget.
- If you raise `MOCK_SERVER_TOTAL_COUNT`, throttle the fan-out with the
  application-level limiter (see the `demo-limiter` topology and the
  `products-test` app's Limiter tab) instead of flooding the platform.
- Memory in the worker stays flat — only one page (≤ 10 products) is in Node
  heap at any moment.
- Mock server memory is also flat — products are generated on demand from a
  seeded PRNG, never stored.

## Why a simulation at all?

A real product catalog is heavy to stand up. The mock returns a Magento 2 REST
shape that is byte-compatible with a real product API for the fields a worker
actually consumes, so the connectors and mapper can be pointed at a real backend
later by swapping the application's `baseUrl`.
