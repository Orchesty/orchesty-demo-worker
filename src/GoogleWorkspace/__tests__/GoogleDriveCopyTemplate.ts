import { container } from '@orchesty/nodejs-sdk';
import CoreFormsEnum from '@orchesty/nodejs-sdk/dist/lib/Application/Base/CoreFormsEnum';
import { ACCESS_TOKEN } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Provider/OAuth2/OAuth2Provider';
import { TOKEN } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/Basic/ABasicApplication';
import { CLIENT_ID, CLIENT_SECRET } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/OAuth2/IOAuth2Application';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { registerApplicationInstall } from '../../CreateOrder/mockApplicationInstall';
import { prepareCreateOrderTests } from '../../CreateOrder/prepareCreateOrderTests';
import { NAME } from '../Connector/GoogleDriveCopyTemplate';
import { ORDER_SETTINGS, TEMPLATE_FILE_ID } from '../GoogleWorkspaceApplication';

describe('GoogleDriveCopyTemplate', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        registerApplicationInstall('google-workspace', {
            [CoreFormsEnum.AUTHORIZATION_FORM]: {
                [CLIENT_ID]: 'client',
                [CLIENT_SECRET]: 'secret',
                [TOKEN]: { [ACCESS_TOKEN]: 'google-token' },
            },
            [ORDER_SETTINGS]: { [TEMPLATE_FILE_ID]: 'template-1' },
        });
        tester = new NodeTester(container, __filename);
    });

    it('copies the template into the client folder', async () => {
        await tester.testConnector(NAME);
    });
});
