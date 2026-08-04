/**
 * Page-on-demand product generator.
 *
 * The whole point of this module: never hold the full catalog in memory.
 * For a requested page (currentPage, pageSize) we compute exactly the
 * `pageSize` products belonging to that page from a deterministic seed
 * derived from the global product index `i`. RAM stays flat regardless of
 * `total_count` — 100k or 10M, it's the same memory footprint.
 *
 * Output shape mirrors Magento 2 REST `GET /rest/V1/products` so a real
 * Magento connector and our mock are interchangeable from the worker's
 * point of view.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import {
    CATEGORIES,
    COLORS,
    LONG_DESCRIPTION_FRAGMENTS,
    PRODUCT_NAME_BASES,
    SHORT_DESCRIPTIONS,
    SIZES,
} from './templates';

// ─── Types matching Magento 2 REST product response ───────────────────────

export interface IMagentoCustomAttribute {
    attribute_code: string;
    value: string | string[];
}

export interface IMagentoCategoryLink {
    position: number;
    category_id: string;
}

export interface IMagentoStockItem {
    qty: number;
    is_in_stock: boolean;
    manage_stock: boolean;
    min_qty: number;
    use_config_min_qty: boolean;
    item_id?: number;
}

export interface IMagentoMediaGalleryEntry {
    id: number;
    media_type: 'image';
    label: string | null;
    position: number;
    disabled: boolean;
    types: string[];
    file: string;
}

export interface IMagentoProduct {
    id: number;
    sku: string;
    name: string;
    attribute_set_id: number;
    price: number;
    status: number;
    visibility: number;
    type_id: 'simple';
    created_at: string;
    updated_at: string;
    weight: number;
    extension_attributes: {
        website_ids: number[];
        category_links: IMagentoCategoryLink[];
        stock_item: IMagentoStockItem;
    };
    product_links: unknown[];
    options: unknown[];
    media_gallery_entries: IMagentoMediaGalleryEntry[];
    tier_prices: unknown[];
    custom_attributes: IMagentoCustomAttribute[];
}

export interface IMagentoListResponse {
    items: IMagentoProduct[];
    search_criteria: {
        filter_groups: unknown[];
        page_size: number;
        current_page: number;
    };
    total_count: number;
}

// ─── Deterministic PRNG (mulberry32) keyed by product index ───────────────

/**
 * Tiny seeded PRNG. Same `seed` always yields the same sequence — that's
 * why product `i` looks identical across runs. Good enough for fake data,
 * not crypto.
 */
function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return function next(): number {
        t = (t + 0x6D2B79F5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function pad(num: number, width: number): string {
    return String(num).padStart(width, '0');
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(rng: () => number, arr: readonly T[], min: number, max: number): T[] {
    const count = min + Math.floor(rng() * (max - min + 1));
    const indices = new Set<number>();
    while (indices.size < Math.min(count, arr.length)) {
        indices.add(Math.floor(rng() * arr.length));
    }
    return Array.from(indices).map((i) => arr[i]);
}

// ─── Single-product generator ─────────────────────────────────────────────

const CATALOG_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

/**
 * Returns a fully-formed Magento product for catalog index `i` (1-based).
 *
 * Deterministic: same `i` always yields the same product, allowing tests to
 * be reproducible and the sink to spot duplicate deliveries (same `id`
 * arriving twice == retry / replay).
 */
export function generateProduct(i: number): IMagentoProduct {
    const rng = mulberry32(i);

    const base = pick(rng, PRODUCT_NAME_BASES);
    const color = pick(rng, COLORS);
    const size = pick(rng, SIZES);
    const categories = pickN(rng, CATEGORIES, 1, 3);

    const id = i;
    const sku = `MAG-${pad(i, 7)}`;
    const name = `${base} — ${color.name} / ${size.name}`;
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Price: 9.99 .. 199.99 with two-decimal rounding
    const price = Math.round((9.99 + rng() * 190) * 100) / 100;
    const weight = Math.round(rng() * 200) / 100; // 0..2 kg
    const qty = Math.floor(rng() * 500); // 0..499

    // Spread updated_at across the last 90 days so syncs by `updated_at` look
    // realistic. created_at is fixed to the catalog epoch for determinism.
    const dayOffset = Math.floor(rng() * 90);
    const updatedAt = new Date(CATALOG_EPOCH_MS + dayOffset * 86400000).toISOString().replace('T', ' ').slice(0, 19);

    const shortDesc = pick(rng, SHORT_DESCRIPTIONS);
    const longDesc = pickN(rng, LONG_DESCRIPTION_FRAGMENTS, 2, 4).join(' ');

    const imageFile = `/${slug.charAt(0)}/${slug.charAt(1) || 'x'}/${slug}.jpg`;

    return {
        id,
        sku,
        name,
        attribute_set_id: 9,
        price,
        status: 1,
        visibility: 4,
        type_id: 'simple',
        created_at: '2026-01-01 00:00:00',
        updated_at: updatedAt,
        weight,
        extension_attributes: {
            website_ids: [1],
            category_links: categories.map((cat, idx) => ({
                position: idx,
                category_id: String(cat.id),
            })),
            stock_item: {
                item_id: id,
                qty,
                is_in_stock: qty > 0,
                manage_stock: true,
                min_qty: 0,
                use_config_min_qty: true,
            },
        },
        product_links: [],
        options: [],
        media_gallery_entries: [
            {
                id,
                media_type: 'image',
                label: name,
                position: 1,
                disabled: false,
                types: ['image', 'small_image', 'thumbnail'],
                file: imageFile,
            },
        ],
        tier_prices: [],
        custom_attributes: [
            { attribute_code: 'description', value: longDesc },
            { attribute_code: 'short_description', value: shortDesc },
            { attribute_code: 'url_key', value: `${slug}-${id}` },
            { attribute_code: 'category_ids', value: categories.map((cat) => String(cat.id)) },
            { attribute_code: 'tax_class_id', value: '2' },
            { attribute_code: 'color', value: color.code },
            { attribute_code: 'size', value: size.code },
        ],
    };
}

// ─── Page generator ───────────────────────────────────────────────────────

export function generateProductPage(
    currentPage: number,
    pageSize: number,
    totalCount: number,
): IMagentoListResponse {
    const start = (currentPage - 1) * pageSize + 1; // 1-based to mimic Magento ids
    const end = Math.min(currentPage * pageSize, totalCount);

    const items: IMagentoProduct[] = [];
    for (let i = start; i <= end; i += 1) {
        items.push(generateProduct(i));
    }

    return {
        items,
        search_criteria: {
            filter_groups: [],
            page_size: pageSize,
            current_page: currentPage,
        },
        total_count: totalCount,
    };
}
