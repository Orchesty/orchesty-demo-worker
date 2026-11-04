import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import ResultCode from '@orchesty/nodejs-sdk/dist/lib/Utils/ResultCode';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import { ICopiedOrder, IOrderDraft } from '../../CreateOrder/OrderPayload';
import GoogleWorkspaceApplication, {
    ORDER_SETTINGS,
    TEMPLATE_FILE_ID,
} from '../GoogleWorkspaceApplication';

export const NAME = 'google-drive-copy-template';

export type IInput = IOrderDraft;

export type IOutput = ICopiedOrder;

/**
 * Copies the Google Doc template into the client folder. Does not change sharing.
 */
export default class GoogleDriveCopyTemplate extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();
        checkParams(data as unknown as Record<string, unknown>, ['folder', 'documentName']);

        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const templateId = appInstall.getSettings()?.[ORDER_SETTINGS]?.[TEMPLATE_FILE_ID] as string | undefined;
        if (!templateId) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'V aplikaci Google Workspace chybí šablona objednávky.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        const app = this.getApplication<GoogleWorkspaceApplication>();
        const request = app.getRequestDto(
            dto,
            appInstall,
            HttpMethods.POST,
            `/drive/v3/files/${encodeURIComponent(templateId)}/copy?fields=id,name,webViewLink&supportsAllDrives=true`,
            {
                name: data.documentName,
                parents: [data.folder.id],
            },
        );

        const response = await this.getSender().send(request, {
            success: [200],
            stopAndFail: '<500',
            repeat: '>=500',
        }, 60, 3);

        const body = JSON.parse(response.getBody()) as { id?: string; webViewLink?: string };
        if (!body.id) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'Google Drive nevrátil identifikátor kopie šablony.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        return dto.setNewJsonData<IOutput>({
            ...data,
            documentId: body.id,
            documentUrl: body.webViewLink ?? `https://docs.google.com/document/d/${body.id}/edit`,
        });
    }

}
