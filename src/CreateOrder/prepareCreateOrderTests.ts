import { container, initiateContainer } from '@orchesty/nodejs-sdk';
import { registerCreateOrder } from './registerCreateOrder';

let ready = false;

/** Container for unit tests. Does not start the worker HTTP server. */
export function prepareCreateOrderTests(): void {
    if (ready) {
        return;
    }
    ready = true;
    initiateContainer();
    registerCreateOrder(container);
}
