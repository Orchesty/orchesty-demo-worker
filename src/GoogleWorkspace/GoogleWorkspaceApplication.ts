import { AGoogle } from '@orchesty/connector-google-common';
import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import Field from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Field';
import FieldType from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FieldType';
import Form from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Form';
import FormStack from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FormStack';
import ScopeSeparatorEnum from '@orchesty/nodejs-sdk/dist/lib/Authorization/ScopeSeparatorEnum';
import RequestDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/RequestDto';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import AProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/AProcessDto';
import { CommonHeaders, JSON_TYPE } from '@orchesty/nodejs-sdk/dist/lib/Utils/Headers';

export const NAME = 'google-workspace';
export const BASE_URL = 'https://www.googleapis.com';

export const ORDER_SETTINGS = 'order_settings';
export const PROJECTS_FOLDER_ID = 'projects_folder_id';
export const TEMPLATE_FILE_ID = 'template_file_id';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents';

const LOGO = `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#1a73e8"/><text x="32" y="38" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#fff">Docs</text></svg>',
).toString('base64')}`;

/**
 * Google Drive + Docs for the order draft.
 *
 * Full Drive scope is required: the project folders and the template already
 * exist and were not created by this app. `drive.file` cannot see them.
 * Order settings (folder, template) stay out of `isAuthorized`.
 */
export default class GoogleWorkspaceApplication extends AGoogle {

    public getName(): string {
        return NAME;
    }

    public getPublicName(): string {
        return 'Google Workspace';
    }

    public getDescription(): string {
        return 'Copies an order template into the client project folder and fills known placeholders.';
    }

    public getLogo(): string {
        return LOGO;
    }

    public getBaseUrl(): string {
        return BASE_URL;
    }

    public getScopes(_applicationInstall: ApplicationInstall): string[] {
        return [DRIVE_SCOPE, DOCS_SCOPE];
    }

    public getFormStack(): FormStack {
        const settings = new Form(ORDER_SETTINGS, 'Order settings')
            .addField(new Field(FieldType.TEXT, PROJECTS_FOLDER_ID, 'Projects folder ID', null, true))
            .addField(new Field(FieldType.TEXT, TEMPLATE_FILE_ID, 'Order template file ID', null, true));

        return super.getFormStack().addForm(settings);
    }

    public getRequestDto(
        dto: AProcessDto,
        applicationInstall: ApplicationInstall,
        method: HttpMethods,
        url?: string,
        data?: unknown,
    ): RequestDto {
        const request = super.getRequestDto(dto, applicationInstall, method, url, data);
        if (request instanceof Promise) {
            throw new Error('Google Workspace request builder must stay synchronous.');
        }
        request.getHeaders()[CommonHeaders.CONTENT_TYPE] = JSON_TYPE;
        return request;
    }

    protected getScopesSeparator(): string {
        return ScopeSeparatorEnum.SPACE;
    }

}
