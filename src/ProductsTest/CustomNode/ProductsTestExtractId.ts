import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';

export const NAME = 'products-test-extract-id';

export interface IInput {
    id: number;
}

export interface IOutput {
    id: number;
}

/**
 * Trims a full product coming from the list batch down to `{ id }`: the exact
 * input shape the `products-test-get-product` connector expects.
 *
 * Placed between the batch and the GET connector, it lets a single bulk listing
 * fan out into many single-product fetches. Rate limiting is intentionally NOT
 * done here: the platform applies the application-level limiter (configured in
 * the Products Test app's Limiter tab) to every app-bound node automatically,
 * including the connector after this mapper. Calling `dto.setLimiter()` here
 * would overwrite that platform-managed `limiter-key` header and disable it.
 */
export default class ProductsTestExtractId extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public processAction(dto: ProcessDto<IInput>): ProcessDto<IOutput> {
        const { id } = dto.getJsonData();

        return dto.setJsonData({ id });
    }

}
