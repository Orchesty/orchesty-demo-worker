import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import { F_GREETING, F_LANGUAGE, F_SHOUT, MESSAGE_SETTINGS } from '../FormsDemoApplication';

export const NAME = 'forms-demo-message-builder';

export interface IInput {
    name?: string;
}

export interface IOutput {
    name: string;
    language: string;
    message: string;
}

/**
 * First node of the Forms Demo topology.
 *
 * It seeds a default payload (so the topology works even with an empty start
 * event) and then applies the "Message settings" form:
 *   - greeting (text)   → the greeting word
 *   - language (select) → carried into the payload
 *   - shout (checkbox)  → uppercases the whole message
 *
 * Because it reads form settings, the node must be registered WITH the
 * application (`container.setNode(new MessageBuilder(), formsDemoApp)`).
 */
export default class MessageBuilder extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const name = dto.getJsonData().name ?? 'World';

        const settings = (await this.getApplicationInstallFromProcess(dto)).getSettings();
        const form = (settings[MESSAGE_SETTINGS] ?? {}) as Record<string, unknown>;
        const greeting = (form[F_GREETING] as string) ?? 'Hello';
        const language = (form[F_LANGUAGE] as string) ?? 'en';
        const shout = form[F_SHOUT] === true || form[F_SHOUT] === 'true';

        let message = `${greeting}, ${name}!`;
        if (shout) {
            message = message.toUpperCase();
        }

        return dto.setNewJsonData({ name, language, message });
    }

}
