import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import { F_ADD_TIMESTAMP, F_SIGNATURE, F_WRAP, OUTPUT_SETTINGS } from '../FormsDemoApplication';
import { IOutput as IBuilt } from './MessageBuilder';

export const NAME = 'forms-demo-message-formatter';

export interface IOutput extends IBuilt {
    formattedAt?: string;
}

/**
 * Second node of the Forms Demo topology.
 *
 * It takes the message produced upstream and applies the "Output settings" form:
 *   - wrap (select)           → wraps the message in brackets / quotes / nothing
 *   - signature (text)        → appended to the message
 *   - add_timestamp (checkbox)→ adds a `formattedAt` field
 *
 * Like MessageBuilder, it reads form settings and therefore must be registered
 * WITH the application.
 */
export default class MessageFormatter extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IBuilt>): Promise<ProcessDto<IOutput>> {
        const data = dto.getJsonData();

        const settings = (await this.getApplicationInstallFromProcess(dto)).getSettings();
        const form = (settings[OUTPUT_SETTINGS] ?? {}) as Record<string, unknown>;
        const wrap = (form[F_WRAP] as string) ?? 'none';
        const addTimestamp = form[F_ADD_TIMESTAMP] === true || form[F_ADD_TIMESTAMP] === 'true';
        const signature = (form[F_SIGNATURE] as string) ?? '';

        let { message } = data;
        if (wrap === 'brackets') {
            message = `[${message}]`;
        } else if (wrap === 'quotes') {
            message = `"${message}"`;
        }
        if (signature) {
            message = `${message} ${signature}`;
        }

        const out: IOutput = { ...data, message };
        if (addTimestamp) {
            out.formattedAt = new Date().toISOString();
        }

        return dto.setNewJsonData(out);
    }

}
