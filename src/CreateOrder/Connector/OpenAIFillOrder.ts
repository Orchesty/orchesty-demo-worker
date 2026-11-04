import { getOutputText } from '@orchesty/connector-open-ai/dist/Connector/OpenAIPostResponseConnector';
import AConnector from '@orchesty/nodejs-sdk/dist/lib/Connector/AConnector';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import ResultCode from '@orchesty/nodejs-sdk/dist/lib/Utils/ResultCode';
import { checkParams } from '@orchesty/nodejs-sdk/dist/lib/Utils/Validations';
import {
    INarrativeFields,
    IOrderDraft,
    IOrderWithFolder,
} from '../OrderPayload';
import {
    formatCurrency,
    formatOrderDate,
    formatPrice,
    formatScope,
    placeholder,
    unfilledPlaceholders,
} from '../orderText';

export const NAME = 'open-ai-fill-order';

const MODEL = 'gpt-4.1-mini';

export type IInput = IOrderWithFolder;

export type IOutput = IOrderDraft;

function textOr(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? fallback : trimmed;
}

function buildOpenAiRequest(order: IOrderWithFolder): Record<string, unknown> {
    return {
        model: MODEL,
        store: false,
        temperature: 0.2,
        instructions: [
            'Připravuješ koncept objednávky. Vrať jen JSON podle schématu.',
            'nazevObjednavky je krátký název z předmětu a jména zákazníka. Bez ceny, termínu a právních ujednání.',
            'technickaSpecifikace je formulační úprava zadaného popisu. Nic nepřidávej: žádný rozsah, cenu, termín, součinnost ani platební podmínky.',
        ].join(' '),
        input: [
            `Zákazník: ${order.customer.name}`,
            `Předmět: ${order.subject}`,
            `Popis: ${order.description}`,
        ].join('\n'),
        text: {
            format: {
                type: 'json_schema',
                name: 'order_wording',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['nazevObjednavky', 'technickaSpecifikace'],
                    properties: {
                        nazevObjednavky: { type: 'string' },
                        technickaSpecifikace: { type: 'string' },
                    },
                },
            },
        },
    };
}

function buildReplacements(order: IOrderWithFolder, narrative: INarrativeFields): Record<string, string> {
    const replacements: Record<string, string> = {};
    function put(name: string, value: string | undefined): void {
        const trimmed = value?.trim() ?? '';
        if (trimmed !== '') {
            replacements[placeholder(name)] = trimmed;
        }
    }

    put('NAZEV_ZAKAZNIKA', order.customer.name);
    put('SIDLO_ZAKAZNIKA', order.customer.address);
    put('ICO_ZAKAZNIKA', order.customer.ico);
    put('EMAIL_ZAKAZNIKA', order.email);
    put('NAZEV_OBJEDNAVKY', textOr(narrative.nazevObjednavky, `${order.subject} – ${order.customer.name}`));
    put('PREDMET_OBJEDNAVKY', order.subject);
    put('TECHNICKA_SPECIFIKACE', textOr(narrative.technickaSpecifikace, order.description));
    put('ROZSAH_PLNENI', formatScope(order.effortMd));
    put('CENA_PLNENI', formatPrice(order.hourlyRate, order.effortMd));
    put('MENA', formatCurrency(order.currency));

    return replacements;
}

/**
 * One call to the OpenAI Responses API. The stock connector replaces the whole
 * payload with the API body, so this node sends the same request and merges
 * the wording back into the order. `getOutputText` comes from that package.
 *
 * Price, scope, subject and ARES fields are filled here. The model only
 * rephrases the title and the technical description. Legal clauses, the
 * delivery date and signatures stay as placeholders.
 */
export default class OpenAIFillOrder extends AConnector {

    public getName(): string {
        return NAME;
    }

    public async processAction(dto: ProcessDto<IInput>): Promise<ProcessDto<IOutput>> {
        const order = dto.getJsonData();
        checkParams(order as unknown as Record<string, unknown>, ['customer', 'subject', 'description', 'hourlyRate', 'effortMd']);

        const appInstall = await this.getApplicationInstallFromProcess(dto);
        const request = await this.getApplication().getRequestDto(
            dto,
            appInstall,
            HttpMethods.POST,
            '/v1/responses',
            buildOpenAiRequest(order),
        );
        const response = await this.getSender().send(request, {
            success: [200],
            stopAndFail: '<500',
            repeat: '>=500',
        }, 60, 3);

        const parsed: unknown = JSON.parse(response.getBody());
        let text: string;
        try {
            text = getOutputText(parsed as Parameters<typeof getOutputText>[0]);
        } catch {
            text = '';
        }
        if (!text.trim()) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'OpenAI nevrátilo text objednávky.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        let narrative: INarrativeFields;
        try {
            narrative = JSON.parse(text) as INarrativeFields;
        } catch {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, 'OpenAI nevrátilo platný JSON pro objednávku.');
            return dto as unknown as ProcessDto<IOutput>;
        }

        const replacements = buildReplacements(order, narrative);
        return dto.setNewJsonData<IOutput>({
            ...order,
            documentName: `Objednávka – ${order.customer.name} – ${order.subject} – ${formatOrderDate()}`,
            replacements,
            unfilled: unfilledPlaceholders(replacements),
        });
    }

}
