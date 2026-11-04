import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import { IAresHit, IOrderRequest, IOrderWithAres } from '../../CreateOrder/OrderPayload';
import AresApplication, { BASE_URL } from '../AresApplication';

export const NAME = 'ares-search-subject';

const ICO_PATTERN = /^\d{8}$/;

export type IInput = IOrderRequest;

export type IOutput = IOrderWithAres;

/**
 * One ARES call. Eight digits are an IČO (GET), anything else is a trade name (POST search).
 */
export default class AresSearchSubject extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();
        checkParams(data as unknown as Record<string, unknown>, ['client']);

        const client = data.client.trim();
        const byIco = ICO_PATTERN.test(client);
        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const app = this.getApplication<AresApplication>();
        const request = app.getRequestDto(
            dto,
            appInstall,
            byIco ? HttpMethods.GET : HttpMethods.POST,
            byIco
                ? `${BASE_URL}/ekonomicke-subjekty/${client}`
                : `${BASE_URL}/ekonomicke-subjekty/vyhledat`,
            byIco ? undefined : { obchodniJmeno: client, start: 0, pocet: 10 },
        );

        const response = await this.getSender().send(request, {
            success: [200],
            stopAndFail: '<500',
            repeat: '>=500',
        }, 60, 3);

        const body = JSON.parse(response.getBody()) as IAresHit & { ekonomickeSubjekty?: IAresHit[] };
        const ekonomickeSubjekty = byIco
            ? [body]
            : (body.ekonomickeSubjekty ?? []);

        return dto.setNewJsonData<IOutput>({
            ...data,
            ares: { ekonomickeSubjekty },
        });
    }

}
