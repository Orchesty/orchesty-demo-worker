import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import ProductsTestApplication from '../ProductsTestApplication';

export const NAME = 'products-test-get-product';

export interface IInput {
    id: number;
}

export interface IOutput {
    id: number;
    sku: string;
    name: string;
    price: number;
}

/**
 * Fetches a single product by id — the "regular connector" demo surface.
 *
 * Calls `GET /api/products/:id` on the unified mock server exactly once and
 * returns a trimmed view of the product for the next node in the topology.
 */
export default class ProductsTestGetProduct extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();
        checkParams(data as unknown as Record<string, unknown>, ['id']);

        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const app = this.getApplication<ProductsTestApplication>();
        const request = app.getRequestDto(dto, appInstall, HttpMethods.GET, `/api/products/${data.id}`);

        const response = await this.getSender().send(request, {
            success: [200],
            stopAndFail: '<500',
            repeat: '>=500',
        }, 60, 3);

        const body = JSON.parse(response.getBody()) as { id: number; sku: string; name: string; price: number };

        return dto.setNewJsonData<IOutput>({
            id: body.id,
            sku: body.sku,
            name: body.name,
            price: body.price,
        });
    }

}
