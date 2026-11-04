import { API_KEY } from '@orchesty/connector-open-ai/dist/OpenAIApplication';
import { container } from '@orchesty/nodejs-sdk';
import CoreFormsEnum from '@orchesty/nodejs-sdk/dist/lib/Application/Base/CoreFormsEnum';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { NAME } from '../Connector/OpenAIFillOrder';
import { registerApplicationInstall } from '../mockApplicationInstall';
import { prepareCreateOrderTests } from '../prepareCreateOrderTests';

describe('OpenAIFillOrder', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        registerApplicationInstall('open-ai', {
            [CoreFormsEnum.AUTHORIZATION_FORM]: { [API_KEY]: 'sk-test' },
        });
        tester = new NodeTester(container, __filename);
    });

    it('fills known placeholders and leaves the rest', async () => {
        await tester.testConnector(NAME);
    });

    it('keeps an e-mail the user supplied', async () => {
        await tester.testConnector(NAME, 'email');
    });
});
