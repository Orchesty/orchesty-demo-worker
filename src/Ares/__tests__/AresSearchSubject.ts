import { container } from '@orchesty/nodejs-sdk';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { registerApplicationInstall } from '../../CreateOrder/mockApplicationInstall';
import { prepareCreateOrderTests } from '../../CreateOrder/prepareCreateOrderTests';
import { NAME } from '../Connector/AresSearchSubject';

describe('AresSearchSubject', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        registerApplicationInstall('ares', {});
        tester = new NodeTester(container, __filename);
    });

    it('searches by trade name', async () => {
        await tester.testConnector(NAME);
    });

    it('loads a subject by IČO', async () => {
        await tester.testConnector(NAME, 'ico');
    });
});
