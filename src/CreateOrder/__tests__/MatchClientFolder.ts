import { container } from '@orchesty/nodejs-sdk';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { NAME } from '../CustomNode/MatchClientFolder';
import { prepareCreateOrderTests } from '../prepareCreateOrderTests';

describe('MatchClientFolder', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        tester = new NodeTester(container, __filename);
    });

    it('accepts the one folder contained in the ARES name', async () => {
        await tester.testCustomNode(NAME);
    });

    it('fails when no folder matches', async () => {
        await tester.testCustomNode(NAME, 'missing');
    });

    it('fails when several folders match', async () => {
        await tester.testCustomNode(NAME, 'ambiguous');
    });
});
