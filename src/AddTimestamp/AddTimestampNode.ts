import ACommonNode from '@orchesty/nodejs-sdk/dist/lib/Commons/ACommonNode';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';

export default class AddTimestampNode extends ACommonNode {

    public getName(): string {
        return 'add-timestamp';
    }

    public processAction(dto: ProcessDto): ProcessDto {
        const data = dto.getJsonData() as Record<string, unknown>;
        dto.setJsonData({
            ...data,
            receivedAt: new Date().toISOString(),
        });

        return dto;
    }

}
