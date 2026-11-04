import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import FormStack from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FormStack';
import { ABasicApplication } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/Basic/ABasicApplication';
import RequestDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/RequestDto';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import AProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/AProcessDto';
import { CommonHeaders, JSON_TYPE } from '@orchesty/nodejs-sdk/dist/lib/Utils/Headers';

export const NAME = 'ares';
export const BASE_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';

const LOGO = `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#0b3d91"/><text x="32" y="38" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#fff">ARES</text></svg>',
).toString('base64')}`;

/**
 * Public ARES REST. No credentials — Czech business registry lookups are open.
 */
export default class AresApplication extends ABasicApplication {

    public getName(): string {
        return NAME;
    }

    public getPublicName(): string {
        return 'ARES';
    }

    public getDescription(): string {
        return 'Czech business registry. Looks up a customer by name or IČO.';
    }

    public getLogo(): string {
        return LOGO;
    }

    public isAuthorized(_applicationInstall: ApplicationInstall): boolean {
        return true;
    }

    public getFormStack(): FormStack {
        return new FormStack();
    }

    public getRequestDto(
        dto: AProcessDto,
        _applicationInstall: ApplicationInstall,
        method: HttpMethods,
        url?: string,
        data?: unknown,
    ): RequestDto {
        const target = !url || url.startsWith('http') ? (url ?? BASE_URL) : `${BASE_URL}${url}`;
        return new RequestDto(target, method, dto, data, {
            [CommonHeaders.CONTENT_TYPE]: JSON_TYPE,
            [CommonHeaders.ACCEPT]: JSON_TYPE,
        });
    }

}
