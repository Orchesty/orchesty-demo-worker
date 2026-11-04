import { container } from '@orchesty/nodejs-sdk';
import CoreFormsEnum from '@orchesty/nodejs-sdk/dist/lib/Application/Base/CoreFormsEnum';
import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import { ACCESS_TOKEN } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Provider/OAuth2/OAuth2Provider';
import { TOKEN } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/Basic/ABasicApplication';
import { CLIENT_ID, CLIENT_SECRET } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/OAuth2/IOAuth2Application';
import NodeTester from '@orchesty/nodejs-sdk/dist/test/Testers/NodeTester';
import { registerApplicationInstall } from '../../CreateOrder/mockApplicationInstall';
import { prepareCreateOrderTests } from '../../CreateOrder/prepareCreateOrderTests';
import { NAME } from '../Connector/GoogleDriveListClientFolders';
import { ORDER_SETTINGS, PROJECTS_FOLDER_ID, TEMPLATE_FILE_ID } from '../GoogleWorkspaceApplication';

function googleSettings(withFolder: boolean): Record<string, unknown> {
    return {
        [CoreFormsEnum.AUTHORIZATION_FORM]: {
            [CLIENT_ID]: 'client',
            [CLIENT_SECRET]: 'secret',
            [TOKEN]: { [ACCESS_TOKEN]: 'google-token' },
        },
        [ORDER_SETTINGS]: withFolder
            ? { [PROJECTS_FOLDER_ID]: 'folder-root', [TEMPLATE_FILE_ID]: 'template-1' }
            : {},
    };
}

describe('GoogleDriveListClientFolders', () => {
    let tester: NodeTester;

    beforeAll(() => {
        prepareCreateOrderTests();
        tester = new NodeTester(container, __filename);
    });

    it('lists folders under the projects root', async () => {
        registerApplicationInstall('google-workspace', googleSettings(true));
        await tester.testConnector(NAME);
    });

    it('fails when the projects folder is not configured', async () => {
        container.getRepository(ApplicationInstall).clearCache();
        registerApplicationInstall('google-workspace', googleSettings(false));
        await tester.testConnector(NAME, 'missing-folder');
    });
});
