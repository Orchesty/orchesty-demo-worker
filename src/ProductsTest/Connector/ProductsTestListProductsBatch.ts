/* eslint-disable @typescript-eslint/naming-convention */
import ABatchNode from '@orchesty/nodejs-sdk/dist/lib/Batch/ABatchNode';
import logger from '@orchesty/nodejs-sdk/dist/lib/Logger/Logger';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import BatchProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/BatchProcessDto';
import ProductsTestApplication from '../ProductsTestApplication';

export const NAME = 'products-test-list-products-batch';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 10;

export interface IInput {
    /** Override the default page size (defaults to 10, capped at 10). */
    pageSize?: number;
    /** Optional cap on the number of products to fetch — useful for smoke tests. */
    maxProducts?: number;
    /** Inject random failures (0..1) on the upstream call — only honoured by mock. */
    failRate?: number;
    /** Inject latency in milliseconds — only honoured by mock. */
    latencyMs?: number;
}

interface IProductListResponseLite {
    items: Record<string, unknown>[];
    total_count: number;
    search_criteria: { current_page: number; page_size: number };
}

/**
 * Pages through the simulated catalog `GET /rest/V1/products` (Magento 2 REST
 * shape served by the bundled mock).
 *
 * The SDK invokes `processAction` once per page; we set the next page on
 * `dto.setBatchCursor` until we've covered `total_count` (or hit the
 * caller-supplied `maxProducts` cap). Each item is forwarded downstream as
 * its own message via `setItemList`, so the mapper runs per-product instead
 * of per-page.
 */
export default class ProductsTestListProductsBatch extends ABatchNode {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: BatchProcessDto): Promise<BatchProcessDto> {
        const input = (dto.getJsonData() ?? {}) as IInput;
        const pageSize = Math.min(Math.max(input.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

        const currentPage = Number(dto.getBatchCursor('1'));

        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const app = this.getApplication<ProductsTestApplication>();

        const queryParts: string[] = [
            `searchCriteria[currentPage]=${currentPage}`,
            `searchCriteria[pageSize]=${pageSize}`,
        ];
        if (input.failRate && input.failRate > 0) queryParts.push(`fail=${input.failRate}`);
        if (input.latencyMs && input.latencyMs > 0) queryParts.push(`latency=${input.latencyMs}`);
        const path = `/rest/V1/products?${queryParts.join('&')}`;

        const response = await this.getSender().send(
            app.getRequestDto(dto, appInstall, HttpMethods.GET, path),
            {
                success: [200],
                stopAndFail: '<500',
                repeat: '>=500',
            },
            60,
            5,
        );

        const body = JSON.parse(response.getBody()) as IProductListResponseLite;
        const items = Array.isArray(body.items) ? body.items : [];
        const totalCount = body.total_count ?? items.length;

        // Optional global cap (smoke tests). Slice the current page if hitting
        // the cap mid-page so the consumer sees exactly `maxProducts` items.
        const maxProducts = input.maxProducts && input.maxProducts > 0 ? input.maxProducts : Number.POSITIVE_INFINITY;
        const fetchedSoFar = (currentPage - 1) * pageSize;
        const remainingBudget = Math.max(maxProducts - fetchedSoFar, 0);
        const emit = items.slice(0, remainingBudget);

        dto.setItemList(emit);

        const fetchedTotal = fetchedSoFar + emit.length;
        const hasMore = fetchedTotal < Math.min(totalCount, maxProducts);
        if (hasMore) {
            dto.setBatchCursor(String(currentPage + 1));
        }

        logger.info(
            `[products-test] page ${currentPage} fetched ${emit.length} items `
                + `(total so far ${fetchedTotal}/${Math.min(totalCount, maxProducts)})`,
            dto,
        );

        return dto;
    }

}
