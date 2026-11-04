import { container } from '@orchesty/nodejs-sdk';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { NAME } from '../CustomNode/PickAresCustomer';
import { prepareCreateOrderTests } from '../prepareCreateOrderTests';

describe('PickAresCustomer', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        tester = new NodeTester(container, __filename);
    });

    it('keeps the only ARES hit', async () => {
        await tester.testCustomNode(NAME);
    });

    it('keeps the trade name that matches exactly', async () => {
        await tester.testCustomNode(NAME, 'exact');
    });

    it('fails when ARES returns nobody', async () => {
        await tester.testCustomNode(NAME, 'empty');
    });

    it('fails when several names match', async () => {
        await tester.testCustomNode(NAME, 'ambiguous');
    });
});
