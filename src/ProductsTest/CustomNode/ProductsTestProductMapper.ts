/* eslint-disable @typescript-eslint/naming-convention */
import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';

export const NAME = 'products-test-product-mapper';

// The simulated catalog emits a Magento 2 REST product shape (snake_case),
// so the input interfaces below mirror that wire format.
interface ICustomAttribute {
    attribute_code: string;
    value: string | string[];
}

interface ICategoryLink {
    position: number;
    category_id: string;
}

interface IMediaGalleryEntry {
    position: number;
    file: string;
    types: string[];
}

interface IStockItem {
    qty: number;
    is_in_stock: boolean;
}

export interface IInput {
    id: number;
    sku: string;
    name: string;
    price: number;
    weight?: number;
    extension_attributes?: {
        category_links?: ICategoryLink[];
        stock_item?: IStockItem;
    };
    media_gallery_entries?: IMediaGalleryEntry[];
    custom_attributes?: ICustomAttribute[];
}

export interface IOutput {
    sourceId: number;
    sku: string;
    name: string;
    price: { amount: number; currency: string };
    stock: { qty: number; inStock: boolean };
    weightKg: number;
    categoryIds: string[];
    mainImage: string | null;
    description: string;
    shortDescription: string;
}

function findAttribute(attrs: ICustomAttribute[] | undefined, code: string): string | string[] | undefined {
    return attrs?.find((a) => a.attribute_code === code)?.value;
}

function pickMainImage(entries: IMediaGalleryEntry[] | undefined): string | null {
    if (!entries || entries.length === 0) return null;
    const primary = entries.find((e) => e.types?.includes('image'));
    return primary?.file ?? entries[0].file ?? null;
}

/**
 * Reshapes a source product into a simple, target-system payload.
 *
 * Doing this in a dedicated CustomNode (rather than inside the connector)
 * keeps the source connector reusable and the mapping rules visible —
 * exactly the topology pattern the SDK encourages.
 */
export default class ProductsTestProductMapper extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public processAction(dto: ProcessDto<IInput>): ProcessDto<IOutput> {
        const product = dto.getJsonData();

        const description = (findAttribute(product.custom_attributes, 'description') as string | undefined) ?? '';
        const shortDescription = (findAttribute(product.custom_attributes, 'short_description') as string | undefined) ?? '';
        const categoryIdsRaw = findAttribute(product.custom_attributes, 'category_ids');
        const categoryIdsFromCustom = Array.isArray(categoryIdsRaw) ? categoryIdsRaw : [];
        const categoryIdsFromLinks = product.extension_attributes?.category_links?.map((l) => l.category_id) ?? [];
        const categoryIds = Array.from(new Set([...categoryIdsFromCustom, ...categoryIdsFromLinks]));

        const stockItem = product.extension_attributes?.stock_item;
        const out: IOutput = {
            sourceId: product.id,
            sku: product.sku,
            name: product.name,
            price: { amount: product.price, currency: 'EUR' },
            stock: {
                qty: stockItem?.qty ?? 0,
                inStock: stockItem?.is_in_stock ?? false,
            },
            weightKg: product.weight ?? 0,
            categoryIds,
            mainImage: pickMainImage(product.media_gallery_entries),
            description,
            shortDescription,
        };

        return dto.setNewJsonData(out);
    }

}
