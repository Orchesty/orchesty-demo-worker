import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import ResultCode from '@orchesty/nodejs-sdk/dist/lib/Utils/ResultCode';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import { IDriveFolder, IOrderWithCustomer, IOrderWithFolders } from '../../CreateOrder/OrderPayload';
import { folderSearchToken } from '../../CreateOrder/orderText';
import GoogleWorkspaceApplication, {
    ORDER_SETTINGS,
    PROJECTS_FOLDER_ID,
} from '../GoogleWorkspaceApplication';

export const NAME = 'google-drive-list-client-folders';

export type IInput = IOrderWithCustomer;

export type IOutput = IOrderWithFolders;

function escapeDriveQuery(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Lists folders under the configured projects root whose name contains the
 * customer's first significant word. Matching is a later custom node.
 */
export default class GoogleDriveListClientFolders extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();
        checkParams(data as unknown as Record<string, unknown>, ['customer']);

        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const folderId = appInstall.getSettings()?.[ORDER_SETTINGS]?.[PROJECTS_FOLDER_ID] as string | undefined;
        if (!folderId) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'V aplikaci Google Workspace chybí složka projektů.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        const token = folderSearchToken(data.customer.name);
        if (!token) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'Jméno zákazníka nejde použít pro hledání složky.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        const query = [
            `'${escapeDriveQuery(folderId)}' in parents`,
            "mimeType = 'application/vnd.google-apps.folder'",
            'trashed = false',
            `name contains '${escapeDriveQuery(token)}'`,
        ].join(' and ');
        const params = new URLSearchParams({
            q: query,
            fields: 'files(id,name)',
            pageSize: '100',
            supportsAllDrives: 'true',
            includeItemsFromAllDrives: 'true',
        });

        const app = this.getApplication<GoogleWorkspaceApplication>();
        const request = app.getRequestDto(
            dto,
            appInstall,
            HttpMethods.GET,
            `/drive/v3/files?${params.toString()}`,
        );

        const response = await this.getSender().send(request, {
            success: [200],
            stopAndFail: '<500',
            repeat: '>=500',
        }, 60, 3);

        const body = JSON.parse(response.getBody()) as { files?: IDriveFolder[] };
        return dto.setNewJsonData<IOutput>({
            ...data,
            folders: (body.files ?? []).map((file) => ({ id: file.id, name: file.name })),
        });
    }

}
