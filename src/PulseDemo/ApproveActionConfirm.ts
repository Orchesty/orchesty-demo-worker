// SDK 5 has no Confirm base yet. Kept so the pulse-demo node still registers.
// eslint-disable-next-line import/no-unresolved
import AConfirm from '@orchesty/nodejs-sdk/dist/lib/Confirm/AConfirm';

export const NAME = 'pulse-demo-approve-action';

export default class ApproveActionConfirm extends AConfirm {

    public getName(): string {
        return NAME;
    }

    public getQuestion(): string {
        return 'Do you want to continue this process?';
    }

    public getDisplayFields(): string[] {
        return ['name', 'id'];
    }

}
