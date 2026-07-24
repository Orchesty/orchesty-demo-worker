import { container, initiateContainer, listen } from '@orchesty/nodejs-sdk';
import AddTimestampNode from './AddTimestamp/AddTimestampNode';
import MessageBuilder from './FormsDemo/CustomNode/MessageBuilder';
import MessageFormatter from './FormsDemo/CustomNode/MessageFormatter';
import FormsDemoApplication from './FormsDemo/FormsDemoApplication';
import ProductsTestGetProduct from './ProductsTest/Connector/ProductsTestGetProduct';
import ProductsTestListProductsBatch from './ProductsTest/Connector/ProductsTestListProductsBatch';
import ProductsTestExtractId from './ProductsTest/CustomNode/ProductsTestExtractId';
import ProductsTestProductMapper from './ProductsTest/CustomNode/ProductsTestProductMapper';
import ProductsTestApplication from './ProductsTest/ProductsTestApplication';
import WebhookTestApplication from './WebhookTest/WebhookTestApplication';

function prepare(): void {
    // Load core services by:
    initiateContainer();

    container.setNode(new AddTimestampNode());

    // Products Test — simulated product catalog. Backs the "regular connector"
    // (get product) and "batch with pagination" (list products) demos.
    const productsTestApp = new ProductsTestApplication();
    container.setApplication(productsTestApp);
    container.setNode(new ProductsTestGetProduct(), productsTestApp);
    container.setNode(new ProductsTestListProductsBatch(), productsTestApp);
    container.setNode(new ProductsTestProductMapper());
    // Extracts { id } from a listed product and stamps a rate limiter — backs
    // the limiter test topology (batch -> extract-id -> get product).
    container.setNode(new ProductsTestExtractId());

    // Webhook Test — registers against the unified mock server, which delivers
    // a test event to the callback URL every minute. The topology's entry point
    // is a Webhook trigger node, so no worker node is needed to receive the event.
    const webhookTestApp = new WebhookTestApplication();
    container.setApplication(webhookTestApp);

    // Forms Demo — two custom settings forms feeding two mapper custom nodes.
    // The nodes are registered WITH the application so they can read form
    // settings via getApplicationInstallFromProcess().
    const formsDemoApp = new FormsDemoApplication();
    container.setApplication(formsDemoApp);
    container.setNode(new MessageBuilder(), formsDemoApp);
    container.setNode(new MessageFormatter(), formsDemoApp);

    // // System event services - imported from @orchesty/connector-common
    // const eventStatusFilterSuccess = new EventStatusFilter(EventEnum.PROCESS_SUCCESS);
    // container.setNode(eventStatusFilterSuccess);
    //
    // const eventStatusFilterError = new EventStatusFilter(EventEnum.PROCESS_FAILED);
    // container.setNode(eventStatusFilterError);
    //
    // const eventStatusFilterLimiter = new EventStatusFilter(EventEnum.LIMIT_OVERFLOW);
    // container.setNode(eventStatusFilterLimiter);
    //
    // const eventStatusFilterTrash = new EventStatusFilter(EventEnum.MESSAGE_IN_TRASH);
    // container.setNode(eventStatusFilterTrash);
    //
    // // Express.js is available by import:
    // import { expressApp } from '@orchesty/nodejs-sdk';
    //
    // // DIContainer is available by import:
    // import { container } from '@orchesty/nodejs-sdk';
    //
    // // How to add Connector to the DIC
    // const myConnector = new MyConnector();
    // container.setNode(myConnector);
    //
    // // How to add CustomNode to the DIC
    // const myCustomNode = new MyCustomNode();
    // container.setNode(myCustomNode);
    //
    // // How to add Batch to the DIC
    // const myBatch = new MyBatch();
    // container.setNode(myBatch);
    //
    // // How to add Application to the DIC
    // const myApp = new MyApp();
    // container.setApplication(myApp);
}

// Start App by:
prepare();
listen().catch((e: unknown) => {
    const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e));
    process.stderr.write(`${err.message}\n${err.stack ?? ''}\n`);
    process.exit(1);
});
