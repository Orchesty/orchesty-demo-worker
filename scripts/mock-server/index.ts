/* eslint-disable no-console */
/**
 * Unified helper server for the Orchesty demo worker.
 *
 * One process the user starts (`npm run mock-server`) that backs three
 * onboarding demos on a single port:
 *
 *   1. Regular connector — GET /api/products/:id
 *        Returns a single deterministic product.
 *
 *   2. Batch with pagination — GET /rest/V1/products?searchCriteria[currentPage]=N
 *                                                    &searchCriteria[pageSize]=M
 *        Returns a Magento 2 REST-shaped product page. Products are generated
 *        on demand, never stored. Chaos knobs: ?fail=0.05  ?latency=200 (ms).
 *
 *   3. Webhook with registration + delivery
 *        POST /webhooks/subscribe      { event, callback, parameters }
 *        POST /webhooks/unsubscribe/:id
 *        POST /webhooks/:id/trigger    (fire one delivery now)
 *        GET  /webhooks                (list active registrations)
 *      Each active registration POSTs { action, timestamp } to its callback
 *      URL once a minute (see webhooks.ts).
 *
 *   GET /health
 *
 * Configurable via env:
 *   MOCK_SERVER_PORT          default 3210
 *   MOCK_SERVER_TOTAL_COUNT   default 100 (kept small on purpose)
 *   MOCK_SERVER_MAX_PAGE_SIZE default 10 (cap)
 *   MOCK_WEBHOOK_INTERVAL_MS  default 60000
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { generateProduct, generateProductPage } from './generator';
import * as webhooks from './webhooks';

const PORT = Number(process.env.MOCK_SERVER_PORT ?? 3210);
const TOTAL_COUNT = Number(process.env.MOCK_SERVER_TOTAL_COUNT ?? 100);
const MAX_PAGE_SIZE = Number(process.env.MOCK_SERVER_MAX_PAGE_SIZE ?? 10);

// ─── Helpers ──────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
}

function sendNotFound(res: ServerResponse): void {
    sendJson(res, 404, { error: 'Not found' });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk as Buffer);
    }
    if (chunks.length === 0) return null;
    const raw = Buffer.concat(chunks).toString('utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
}

async function delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => { setTimeout(resolve, ms); });
}

function parsePaging(url: URL): { currentPage: number; pageSize: number; failRate: number; latencyMs: number } {
    const params = url.searchParams;
    const currentPage = Number(
        params.get('searchCriteria[currentPage]') ?? params.get('currentPage') ?? '1',
    );
    const rawPageSize = Number(
        params.get('searchCriteria[pageSize]') ?? params.get('pageSize') ?? '10',
    );
    const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE);
    const failRate = Math.min(Math.max(Number(params.get('fail') ?? '0'), 0), 1);
    const latencyMs = Math.max(Number(params.get('latency') ?? '0'), 0);
    return { currentPage, pageSize, failRate, latencyMs };
}

// ─── 1. Regular connector: single product ─────────────────────────────────

function handleGetProduct(res: ServerResponse, idRaw: string): void {
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id < 1 || id > TOTAL_COUNT) {
        sendJson(res, 404, { message: `Product [${idRaw}] not found` });
        return;
    }
    console.log(`[mock-server] GET /api/products/${id}`);
    sendJson(res, 200, generateProduct(id));
}

// ─── 2. Batch: paginated product list ─────────────────────────────────────

async function handleListProducts(res: ServerResponse, url: URL): Promise<void> {
    const { currentPage, pageSize, failRate, latencyMs } = parsePaging(url);
    if (latencyMs > 0) await delay(latencyMs);

    if (failRate > 0 && Math.random() < failRate) {
        console.warn(`[mock-server] forced 500 on /rest/V1/products?currentPage=${currentPage}`);
        sendJson(res, 500, { message: 'Simulated upstream failure' });
        return;
    }

    const body = generateProductPage(currentPage, pageSize, TOTAL_COUNT);
    console.log(
        `[mock-server] GET /rest/V1/products page=${currentPage} size=${pageSize} `
            + `delivered=${body.items.length}/${TOTAL_COUNT}`,
    );
    sendJson(res, 200, body);
}

// ─── 3. Webhook subscribe / unsubscribe / trigger / list ──────────────────

async function handleSubscribe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = (await readJsonBody(req)) as {
        event?: string;
        callback?: string;
        parameters?: Record<string, unknown>;
    } | null;

    if (!body?.event || !body?.callback) {
        sendJson(res, 400, { message: 'Body must contain { event, callback }' });
        return;
    }

    const id = webhooks.subscribe(body.event, body.callback, body.parameters ?? {});
    sendJson(res, 200, { id, status: 'subscribed' });
}

function handleUnsubscribe(res: ServerResponse, id: string): void {
    const ok = webhooks.unsubscribe(id);
    sendJson(res, ok ? 200 : 404, { ok, id });
}

async function handleTrigger(res: ServerResponse, id: string): Promise<void> {
    const ok = await webhooks.trigger(id);
    sendJson(res, ok ? 200 : 404, { ok, id });
}

function handleListWebhooks(res: ServerResponse): void {
    sendJson(res, 200, { registrations: webhooks.list() });
}

// ─── Routing ──────────────────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
        const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
        const path = url.pathname;
        const method = req.method ?? 'GET';

        if (method === 'GET' && path === '/rest/V1/products') {
            await handleListProducts(res, url);
            return;
        }

        const productMatch = /^\/api\/products\/([^/]+)$/.exec(path);
        if (method === 'GET' && productMatch) {
            handleGetProduct(res, decodeURIComponent(productMatch[1]));
            return;
        }

        if (method === 'POST' && path === '/webhooks/subscribe') {
            await handleSubscribe(req, res);
            return;
        }
        const unsubMatch = /^\/webhooks\/unsubscribe\/([^/]+)$/.exec(path);
        if (method === 'POST' && unsubMatch) {
            handleUnsubscribe(res, decodeURIComponent(unsubMatch[1]));
            return;
        }
        const triggerMatch = /^\/webhooks\/([^/]+)\/trigger$/.exec(path);
        if (method === 'POST' && triggerMatch) {
            await handleTrigger(res, decodeURIComponent(triggerMatch[1]));
            return;
        }
        if (method === 'GET' && path === '/webhooks') {
            handleListWebhooks(res);
            return;
        }

        if (method === 'GET' && path === '/health') {
            sendJson(res, 200, { ok: true, totalCount: TOTAL_COUNT });
            return;
        }

        sendNotFound(res);
    } catch (err) {
        console.error('[mock-server] handler error', err);
        sendJson(res, 500, { message: (err as Error).message });
    }
}

const server = createServer((req, res) => {
    handleRequest(req, res).catch((err: unknown) => {
        console.error('[mock-server] unhandled error', err);
    });
});

server.listen(PORT, () => {
    console.log(`[mock-server] listening on http://localhost:${PORT}`);
    console.log(`[mock-server] totalCount=${TOTAL_COUNT} maxPageSize=${MAX_PAGE_SIZE}`);
    console.log('[mock-server] routes:');
    console.log('  GET  /api/products/:id                                   (regular connector)');
    console.log('  GET  /rest/V1/products?searchCriteria[currentPage]=N...  (batch)');
    console.log('  POST /webhooks/subscribe   { event, callback }           (webhook register)');
    console.log('  POST /webhooks/unsubscribe/:id                           (webhook remove)');
    console.log('  POST /webhooks/:id/trigger                               (fire one delivery)');
    console.log('  GET  /webhooks                                           (list registrations)');
    console.log('  GET  /health');
    console.log('[mock-server] chaos query params: ?fail=0.05  ?latency=200');
});

function shutdown(signal: string): void {
    console.log(`[mock-server] ${signal} received — shutting down`);
    webhooks.stopAll();
    server.close(() => process.exit(0));
    // Force-exit if close hangs on keep-alive sockets.
    setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
