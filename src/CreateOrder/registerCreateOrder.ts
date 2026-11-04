import OpenAIApplication from '@orchesty/connector-open-ai/dist/OpenAIApplication';
import { OAuth2Provider } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Provider/OAuth2/OAuth2Provider';
import DIContainer from '@orchesty/nodejs-sdk/dist/lib/DIContainer/Container';
import AresApplication from '../Ares/AresApplication';
import AresSearchSubject from '../Ares/Connector/AresSearchSubject';
import GoogleDocsReplacePlaceholders from '../GoogleWorkspace/Connector/GoogleDocsReplacePlaceholders';
import GoogleDriveCopyTemplate from '../GoogleWorkspace/Connector/GoogleDriveCopyTemplate';
import GoogleDriveListClientFolders from '../GoogleWorkspace/Connector/GoogleDriveListClientFolders';
import GoogleWorkspaceApplication from '../GoogleWorkspace/GoogleWorkspaceApplication';
import OpenAIFillOrder from './Connector/OpenAIFillOrder';
import MatchClientFolder from './CustomNode/MatchClientFolder';
import PickAresCustomer from './CustomNode/PickAresCustomer';

export function registerCreateOrder(target: DIContainer): void {
    const ares = new AresApplication();
    target.setApplication(ares);
    target.setNode(new AresSearchSubject(), ares);

    const googleWorkspace = new GoogleWorkspaceApplication(target.get(OAuth2Provider));
    target.setApplication(googleWorkspace);
    target.setNode(new GoogleDriveListClientFolders(), googleWorkspace);
    target.setNode(new GoogleDriveCopyTemplate(), googleWorkspace);
    target.setNode(new GoogleDocsReplacePlaceholders(), googleWorkspace);

    const openAi = new OpenAIApplication();
    target.setApplication(openAi);
    target.setNode(new OpenAIFillOrder(), openAi);

    target.setNode(new PickAresCustomer());
    target.setNode(new MatchClientFolder());
}
