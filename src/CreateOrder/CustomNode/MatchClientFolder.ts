import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import ResultCode from '@orchesty/nodejs-sdk/dist/lib/Utils/ResultCode';
import { IDriveFolder, IOrderWithFolder, IOrderWithFolders } from '../OrderPayload';
import { normalizeName } from '../orderText';

export const NAME = 'match-client-folder';

export type IInput = IOrderWithFolders;

export type IOutput = IOrderWithFolder;

function chooseFolder(
    customerName: string,
    folders: IDriveFolder[],
): { ok: true; folder: IDriveFolder } | { ok: false; reason: string } {
    const customerKey = normalizeName(customerName);
    const scored = folders.map((folder) => ({ folder, key: normalizeName(folder.name) }));
    const exact = scored.filter((item) => item.key !== '' && item.key === customerKey);
    if (exact.length === 1) {
        return { ok: true, folder: exact[0].folder };
    }

    const contains = scored.filter((item) => item.key !== ''
        && customerKey !== ''
        && (item.key.includes(customerKey) || customerKey.includes(item.key)));
    if (exact.length === 0 && contains.length === 1) {
        return { ok: true, folder: contains[0].folder };
    }

    if (exact.length === 0 && contains.length === 0) {
        return { ok: false, reason: `Složka projektu pro „${customerName}“ nebyla nalezena.` };
    }

    const listed = folders.map((folder) => folder.name).join(', ');
    return {
        ok: false,
        reason: `Pro „${customerName}“ je víc složek: ${listed}.`,
    };
}

function withoutFolders(data: IInput): Omit<IInput, 'folders'> {
    return Object.fromEntries(
        Object.entries(data).filter(([name]) => name !== 'folders'),
    ) as Omit<IInput, 'folders'>;
}

/**
 * Prefers one folder whose normalized name equals the customer. Otherwise
 * accepts a single contains-match (ARES name is often longer than the folder).
 * Does not create a folder.
 */
export default class MatchClientFolder extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public processAction(dto: ProcessDto<IInput>): ProcessDto<IOutput> {
        const data = dto.getJsonData();
        const chosen = chooseFolder(data.customer.name, data.folders ?? []);

        if (!chosen.ok) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, chosen.reason);
            return dto as unknown as ProcessDto<IOutput>;
        }

        const rest = withoutFolders(data);
        return dto.setNewJsonData<IOutput>({
            ...rest,
            folder: chosen.folder,
        });
    }

}
