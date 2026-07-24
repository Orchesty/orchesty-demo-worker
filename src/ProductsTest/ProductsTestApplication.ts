import ApplicationTypeEnum from '@orchesty/nodejs-sdk/dist/lib/Application/Base/ApplicationTypeEnum';
import CoreFormsEnum, { getFormName } from '@orchesty/nodejs-sdk/dist/lib/Application/Base/CoreFormsEnum';
import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import Field from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Field';
import FieldType from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FieldType';
import Form from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Form';
import FormStack from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FormStack';
import { ABasicApplication } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/Basic/ABasicApplication';
import RequestDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/RequestDto';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import AProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/AProcessDto';
import { CommonHeaders, JSON_TYPE } from '@orchesty/nodejs-sdk/dist/lib/Utils/Headers';

export const NAME = 'products-test';
export const BASE_URL_KEY = 'baseUrl';
export const TOKEN_KEY = 'token';

const DEFAULT_BASE_URL = 'http://localhost:3210';

/**
 * Products Test application — a simulated product catalog for demos and
 * load testing. It is NOT a real Magento integration.
 *
 * It talks to the bundled mock server (`scripts/mock-magento`), which returns
 * a Magento 2 REST-shaped payload so the demo mirrors a realistic product API
 * without any real e-commerce backend. The mock accepts any/no token, so the
 * dev path is just "set baseUrl to http://localhost:3210 and run".
 */
export default class ProductsTestApplication extends ABasicApplication {

    public getApplicationType(): ApplicationTypeEnum {
        return ApplicationTypeEnum.CRON;
    }

    public getName(): string {
        return NAME;
    }

    public getPublicName(): string {
        return 'Products Test (Simulation)';
    }

    public getDescription(): string {
        return 'Simulated product catalog for demos and load testing. Defaults to the bundled mock server; not a real Magento integration.';
    }

    public isAuthorized(applicationInstall: ApplicationInstall): boolean {
        const form = applicationInstall.getSettings()?.[CoreFormsEnum.AUTHORIZATION_FORM];
        return !!form?.[BASE_URL_KEY];
    }

    public getFormStack(): FormStack {
        const form = new Form(CoreFormsEnum.AUTHORIZATION_FORM, getFormName(CoreFormsEnum.AUTHORIZATION_FORM))
            .addField(new Field(FieldType.TEXT, BASE_URL_KEY, 'Base URL', DEFAULT_BASE_URL, true))
            .addField(new Field(FieldType.TEXT, TOKEN_KEY, 'Admin Bearer Token (optional for mock)', null, false));
        return new FormStack().addForm(form);
    }

    public getRequestDto(
        dto: AProcessDto,
        applicationInstall: ApplicationInstall,
        method: HttpMethods,
        url?: string,
        data?: unknown,
    ): RequestDto {
        const settings = applicationInstall.getSettings()?.[CoreFormsEnum.AUTHORIZATION_FORM] ?? {};
        const baseUrl = (settings[BASE_URL_KEY] as string | undefined)?.replace(/\/+$/, '') ?? DEFAULT_BASE_URL;
        const token = settings[TOKEN_KEY] as string | undefined;

        const target = url ? `${baseUrl}${url.startsWith('/') ? url : `/${url}`}` : baseUrl;
        const request = new RequestDto(target, method, dto);

        const headers: Record<string, string> = {
            [CommonHeaders.CONTENT_TYPE]: JSON_TYPE,
            [CommonHeaders.ACCEPT]: JSON_TYPE,
        };
        if (token) {
            headers[CommonHeaders.AUTHORIZATION] = `Bearer ${token}`;
        }
        request.setHeaders(headers);

        if (data !== undefined && data !== null) {
            request.setJsonBody(data);
        }
        return request;
    }

}
