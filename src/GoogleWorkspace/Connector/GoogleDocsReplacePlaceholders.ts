import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import { ICopiedOrder, IOrderResult } from '../../CreateOrder/OrderPayload';
import GoogleWorkspaceApplication from '../GoogleWorkspaceApplication';

export const NAME = 'google-docs-replace-placeholders';

export type IInput = ICopiedOrder;

export type IOutput = IOrderResult;

interface IReplaceRequest {
    replaceAllText: {
        containsText: { text: string; matchCase: true };
        replaceText: string;
    };
}

/** One batchUpdate request per placeholder that actually has a value. */
export function buildReplaceRequests(replacements: Record<string, string>): IReplaceRequest[] {
    return Object.entries(replacements)
        .filter(([, value]) => value.trim() !== '')
        .map(([text, replaceText]) => ({
            replaceAllText: {
                containsText: { text, matchCase: true },
                replaceText,
            },
        }));
}

/**
 * Fills the copied document. Tokens without a value stay in the file for the user.
 * Nothing is emailed or shared.
 */
export default class GoogleDocsReplacePlaceholders extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();
        checkParams(data as unknown as Record<string, unknown>, ['documentId', 'documentUrl', 'documentName', 'customer']);

        const requests = buildReplaceRequests(data.replacements ?? {});
        if (requests.length > 0) {
            const appInstall = await this.getApplicationInstallFromProcess(dto);
            const app = this.getApplication<GoogleWorkspaceApplication>();
            const request = app.getRequestDto(
                dto,
                appInstall,
                HttpMethods.POST,
                `https://docs.googleapis.com/v1/documents/${encodeURIComponent(data.documentId)}:batchUpdate`,
                { requests },
            );

            await this.getSender().send(request, {
                success: [200],
                stopAndFail: '<500',
                repeat: '>=500',
            }, 60, 3);
        }

        return dto.setNewJsonData<IOutput>({
            status: 'draft',
            documentUrl: data.documentUrl,
            documentName: data.documentName,
            clientName: data.customer.name,
            ico: data.customer.ico,
            unfilled: data.unfilled,
        });
    }

}
