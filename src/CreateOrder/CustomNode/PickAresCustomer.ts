import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';
import ResultCode from '@orchesty/nodejs-sdk/dist/lib/Utils/ResultCode';
import { IAresHit, IOrderWithAres, IOrderWithCustomer } from '../OrderPayload';
import { normalizeName } from '../orderText';

export const NAME = 'pick-ares-customer';

export type IInput = IOrderWithAres;

export type IOutput = IOrderWithCustomer;

function hasIdentity(hit: IAresHit): boolean {
    const name = hit.obchodniJmeno?.trim() ?? '';
    return name !== '' || hit.ico !== undefined;
}

function chooseHit(
    client: string,
    hits: IAresHit[],
): { ok: true; hit: IAresHit } | { ok: false; reason: string } {
    const usable = hits.filter(hasIdentity);
    if (usable.length === 0) {
        return { ok: false, reason: `V ARES nebyl nalezen zákazník „${client}“.` };
    }
    if (usable.length === 1) {
        return { ok: true, hit: usable[0] };
    }

    const wantedIco = client.trim();
    if (/^\d{8}$/.test(wantedIco)) {
        const byIco = usable.filter((hit) => (hit.ico ?? '') === wantedIco);
        if (byIco.length === 1) {
            return { ok: true, hit: byIco[0] };
        }
    }

    const wantedName = normalizeName(client);
    const byName = usable.filter((hit) => normalizeName(hit.obchodniJmeno ?? '') === wantedName);
    if (byName.length === 1) {
        return { ok: true, hit: byName[0] };
    }

    const listed = usable
        .map((hit) => `${hit.obchodniJmeno ?? 'bez názvu'} (${hit.ico ?? 'bez IČO'})`)
        .join(', ');
    return {
        ok: false,
        reason: `V ARES je víc shod pro „${client}“: ${listed}. Zadejte IČO.`,
    };
}

function withoutAres(data: IInput): Omit<IInput, 'ares'> {
    return Object.fromEntries(
        Object.entries(data).filter(([name]) => name !== 'ares'),
    ) as Omit<IInput, 'ares'>;
}

/**
 * Keeps a single ARES hit. Several hits are accepted only when one trade name
 * matches the request exactly (legal-form suffix ignored). Otherwise the run
 * fails and lists the candidates so the user can retry with an IČO.
 */
export default class PickAresCustomer extends ACommonNode {

    public getName(): string {
        return NAME;
    }

    public processAction(dto: ProcessDto<IInput>): ProcessDto<IOutput> {
        const data = dto.getJsonData();
        const hits = data.ares?.ekonomickeSubjekty ?? [];
        const chosen = chooseHit(data.client, hits);

        if (!chosen.ok) {
            dto.setStopProcess(ResultCode.STOP_AND_FAILED, chosen.reason);
            return dto as unknown as ProcessDto<IOutput>;
        }

        const request = withoutAres(data);
        return dto.setNewJsonData<IOutput>({
            ...request,
            customer: {
                source: 'ares',
                name: chosen.hit.obchodniJmeno?.trim() ?? '',
                ico: (chosen.hit.ico ?? '').trim(),
                address: chosen.hit.sidlo?.textovaAdresa?.trim() ?? '',
            },
        });
    }

}
