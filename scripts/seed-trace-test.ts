/* eslint-disable no-console, @typescript-eslint/naming-convention, @typescript-eslint/member-ordering, no-await-in-loop */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ITopologySchema {
    nodes: ITopologyNode[];
    connections: { id: string; from: string; to: string; sourceOutput?: string; targetInput?: string }[];
}

interface ITopologyNode {
    type: string;
    id: string;
    label: string;
    shape: 'circle' | 'square' | 'hexagon';
    name?: string | null;
    action?: { name: string; type: string; worker: string; app: string } | null;
}

interface ITopologyMeta {
    file: string;
    name: string;
    description: string;
    cron: string;
}

interface ITopologySummary {
    name: string;
    id: string;
    created: boolean;
    cronApplied: boolean;
    publishStatus: string;
}

const TOPOLOGY_META: ITopologyMeta[] = [
    {
        file: 'products-to-eshop.json',
        name: 'trace-test-products-to-eshop',
        description: 'Trace test: random product -> enrich -> mock eshop output (every 2 minutes).',
        cron: '*/2 * * * *',
    },
    {
        file: 'update-product.json',
        name: 'trace-test-update-product',
        description: 'Trace test: random product -> enrich -> mock eshop output (every 3 minutes).',
        cron: '*/3 * * * *',
    },
    {
        file: 'product-inventory.json',
        name: 'trace-test-product-inventory',
        description: 'Trace test: full product batch -> enrich -> mock eshop output (every 15 minutes).',
        cron: '*/15 * * * *',
    },
    {
        file: 'create-order.json',
        name: 'trace-test-create-order',
        description: 'Trace test: random order -> enrich -> mock ERP output (every 2 minutes).',
        cron: '*/2 * * * *',
    },
    {
        file: 'update-order.json',
        name: 'trace-test-update-order',
        description: 'Trace test: random order -> enrich -> mock ERP output (every 3 minutes).',
        cron: '*/3 * * * *',
    },
    {
        file: 'order-status.json',
        name: 'trace-test-order-status',
        description: 'Trace test: full order batch -> enrich -> mock ERP output (every 15 minutes).',
        cron: '*/15 * * * *',
    },
];

const RAW_BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
const BACKEND_URL = RAW_BACKEND_URL.endsWith('/api') ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;
const API_KEY = process.env.ORCHESTY_API_KEY;
const BEARER_TOKEN = process.env.ORCHESTY_BEARER_TOKEN;

if (!API_KEY && !BEARER_TOKEN) {
    console.error('Missing ORCHESTY_API_KEY or ORCHESTY_BEARER_TOKEN environment variable.');
    process.exit(1);
}

function authHeaders(): Record<string, string> {
    if (BEARER_TOKEN) {
        return { Authorization: `Bearer ${BEARER_TOKEN}` };
    }
    return { 'X-Auth': API_KEY as string };
}

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...authHeaders(),
    };
    let payload: string | undefined;
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    const response = await fetch(url, { method, headers, body: payload });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${method} ${path} failed: ${response.status} ${response.statusText}\n${text}`);
    }

    if (!text) {
        return undefined as T;
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as unknown as T;
    }
}

interface ITopologyListItem {
    _id?: string;
    id?: string;
    name: string;
    version?: number;
}

interface ITopologyListResponse {
    items?: ITopologyListItem[];
}

async function findTopologyByName(name: string): Promise<ITopologyListItem | undefined> {
    const list = await api<ITopologyListResponse | ITopologyListItem[]>('GET', '/topologies?limit=10000');
    const items = Array.isArray(list) ? list : list.items ?? [];
    const matching = items.filter((item) => item.name === name);
    if (matching.length === 0) {
        return undefined;
    }
    matching.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    return matching[0];
}

interface ITopology {
    _id?: string;
    id?: string;
    name: string;
}

async function createTopology(meta: ITopologyMeta): Promise<ITopology> {
    return api<ITopology>('POST', '/topologies', {
        name: meta.name,
        description: meta.description,
        enabled: true,
    });
}

async function saveSchema(topologyId: string, schema: ITopologySchema): Promise<void> {
    await api('PUT', `/topologies/${topologyId}/schema.json`, schema);
}

interface INodesListItem {
    _id?: string;
    id?: string;
    name?: string;
    type?: string;
}

interface INodesListResponse {
    items?: INodesListItem[];
}

async function listNodes(topologyId: string): Promise<INodesListItem[]> {
    const response = await api<INodesListResponse | INodesListItem[]>('GET', `/topologies/${topologyId}/nodes`);
    return Array.isArray(response) ? response : response.items ?? [];
}

async function patchCronNode(nodeId: string, cron: string): Promise<void> {
    await api('PATCH', `/nodes/${nodeId}`, {
        cron: { time: cron, params: '' },
    });
}

async function publishTopology(topologyId: string): Promise<string> {
    try {
        await api('POST', `/topologies/${topologyId}/publish`);
        return 'ok';
    } catch (error) {
        return (error as Error).message;
    }
}

function loadSchema(file: string): ITopologySchema {
    const path = join(__dirname, '..', 'src', 'TraceTest', 'topologies', file);
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as ITopologySchema;
}

function findCronNodeId(nodes: INodesListItem[], cronNodeName: string): string | undefined {
    const byType = nodes.find((n) => n.type === 'cron');
    if (byType?._id ?? byType?.id) {
        return byType._id ?? byType.id;
    }
    const byName = nodes.find((n) => n.name === cronNodeName);
    return byName?._id ?? byName?.id;
}

async function ensureTopology(meta: ITopologyMeta): Promise<ITopologySummary> {
    const schema = loadSchema(meta.file);

    const cronNode = schema.nodes.find((n) => n.shape === 'circle' && n.label === 'Cron');
    if (!cronNode) {
        throw new Error(`Topology ${meta.name} is missing a Cron start node.`);
    }

    let topology = await findTopologyByName(meta.name);
    let created = false;

    if (!topology) {
        const result = await createTopology(meta);
        const id = result._id ?? result.id;
        if (!id) {
            throw new Error(`Topology create returned no id for ${meta.name}`);
        }
        topology = { _id: id, name: meta.name };
        created = true;
        console.log(`✓ created topology ${meta.name} (${id})`);
    } else {
        console.log(`= reusing topology ${meta.name} (${topology._id ?? topology.id})`);
    }

    const topologyId = (topology._id ?? topology.id) as string;

    await saveSchema(topologyId, schema);
    console.log('  \u21B3 schema saved');

    const publishStatus = await publishTopology(topologyId);
    console.log(`  ↳ publish: ${publishStatus}`);

    const nodes = await listNodes(topologyId);
    const cronNodeId = findCronNodeId(nodes, cronNode.name ?? 'cron');

    let cronApplied = false;
    if (!cronNodeId) {
        console.warn(`  ! cron node not found for ${meta.name} - skipping cron PATCH`);
    } else {
        await patchCronNode(cronNodeId, meta.cron);
        cronApplied = true;
        console.log(`  ↳ cron set to "${meta.cron}" on node ${cronNodeId}`);
    }

    return {
        name: meta.name,
        id: topologyId,
        created,
        cronApplied,
        publishStatus,
    };
}

function listLocalTopologyFiles(): string[] {
    const dir = join(__dirname, '..', 'src', 'TraceTest', 'topologies');
    return readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}

function validateMetaCoversFiles(): void {
    const files = new Set(listLocalTopologyFiles());
    const expected = new Set(TOPOLOGY_META.map((m) => m.file));
    for (const f of files) {
        if (!expected.has(f)) {
            console.warn(`Topology file ${f} has no entry in TOPOLOGY_META, skipping.`);
        }
    }
    for (const m of TOPOLOGY_META) {
        if (!files.has(m.file)) {
            throw new Error(`Topology file ${m.file} declared in TOPOLOGY_META is missing on disk.`);
        }
    }
}

async function main(): Promise<void> {
    console.log(`Trace test seed using backend ${BACKEND_URL}`);
    validateMetaCoversFiles();

    const summaries: ITopologySummary[] = [];
    for (const meta of TOPOLOGY_META) {
        try {
            const summary = await ensureTopology(meta);
            summaries.push(summary);
        } catch (error) {
            console.error(`✗ failed to seed ${meta.name}: ${(error as Error).message}`);
            summaries.push({
                name: meta.name,
                id: '',
                created: false,
                cronApplied: false,
                publishStatus: `error: ${(error as Error).message.split('\n')[0]}`,
            });
        }
    }

    console.log('\nSummary:');
    for (const s of summaries) {
        console.log(`  - ${s.name}: ${s.created ? 'created' : 'reused'} (id=${s.id || '-'}); cron=${s.cronApplied ? 'set' : 'skipped'}; publish=${s.publishStatus}`);
    }

    const failed = summaries.filter((s) => !s.publishStatus.startsWith('ok')).length;
    if (failed > 0) {
        console.error(`\n${failed} topology(ies) failed to fully publish.`);
        process.exit(1);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
