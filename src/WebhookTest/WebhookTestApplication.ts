import ApplicationTypeEnum from '@orchesty/nodejs-sdk/dist/lib/Application/Base/ApplicationTypeEnum';
import AWebhookApplication from '@orchesty/nodejs-sdk/dist/lib/Application/Base/AWebhookApplication';
import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import Webhook from '@orchesty/nodejs-sdk/dist/lib/Application/Database/Webhook';
import FormStack from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FormStack';
import WebhookSubscription from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Webhook/WebhookSubscription';
import AuthorizationTypeEnum from '@orchesty/nodejs-sdk/dist/lib/Authorization/AuthorizationTypeEnum';
import logger from '@orchesty/nodejs-sdk/dist/lib/Logger/Logger';
import RequestDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/RequestDto';
import ResponseDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/ResponseDto';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import AProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/AProcessDto';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';

export const NAME = 'webhook-test';

// Base URL of the unified mock server (see scripts/mock-server). Subscribe /
// unsubscribe are proxied here so the whole webhook lifecycle can be exercised
// locally; the mock then POSTs a test event to the callback URL every minute.
const MOCK_SERVER_URL = (process.env.MOCK_SERVER_URL ?? 'http://localhost:3210').replace(/\/+$/, '');

/**
 * Reference webhook-driven application built on top of the new
 * {@link AWebhookApplication} contract.
 *
 * The application exposes a tiny catalog of fake events (`order.created`,
 * `order.updated`, `ping`) that the UI can subscribe to from the topology
 * detail page. Subscribe / unsubscribe flows do not call any real upstream API
 * — instead they register against the unified mock server (see
 * scripts/mock-server), which then POSTs a test event to the callback URL once
 * a minute. The entire webhook lifecycle (sync register, callback URL, list,
 * unsubscribe, delivery) can thus be exercised without an external dependency.
 *
 * The topology's starting node is a Webhook trigger (`shape: "circle"`,
 * `label: "Webhook"`) bound to this application + event. The platform registers
 * the callback URL against that trigger and delivers inbound events straight
 * into the topology — no worker node is needed to receive them.
 */
export default class WebhookTestApplication extends AWebhookApplication {

    public getName(): string {
        return NAME;
    }

    public getPublicName(): string {
        return 'Webhook Test';
    }

    public getDescription(): string {
        return 'Reference application demonstrating the new UI-driven webhook subscription flow (AWebhookApplication).';
    }

    public getApplicationType(): ApplicationTypeEnum {
        return ApplicationTypeEnum.WEBHOOK;
    }

    public getAuthorizationType(): AuthorizationTypeEnum {
        return AuthorizationTypeEnum.BASIC;
    }

    public isAuthorized(_applicationInstall: ApplicationInstall): boolean {
        return true;
    }

    public getFormStack(): FormStack {
        return new FormStack();
    }

    public getRequestDto(
        dto: AProcessDto,
        _applicationInstall: ApplicationInstall,
        method: HttpMethods,
        url?: string,
        data?: unknown,
    ): RequestDto {
        const request = new RequestDto(url ?? 'http://localhost', method, dto);
        if (data) {
            request.setJsonBody(data);
        }
        return request;
    }

    public getWebhookSubscriptions(): WebhookSubscription[] {
        return [
            WebhookSubscription.create('order.created', { source: 'webhook-test' }),
            WebhookSubscription.create('order.updated', { source: 'webhook-test' }),
            WebhookSubscription.create('ping'),
        ];
    }

    // Subscribe / unsubscribe target the unified mock server (default
    // http://localhost:3210, override via MOCK_SERVER_URL). The mock persists the
    // callback URL, answers 200 so `WebhookManager.subscribeWebhooks` can store a
    // `Webhook` document, and starts POSTing a test event to `url` every minute.
    public getWebhookSubscribeRequestDto(
        _applicationInstall: ApplicationInstall,
        subscription: WebhookSubscription,
        url: string,
    ): RequestDto {
        const request = new RequestDto(
            `${MOCK_SERVER_URL}/webhooks/subscribe`,
            HttpMethods.POST,
            new ProcessDto(),
        );
        request.setJsonBody({
            event: subscription.getName(),
            callback: url,
            parameters: subscription.getParameters(),
        });
        logger.info(`[webhook-test] subscribe for [${subscription.getName()}] -> ${url}`, {});
        return request;
    }

    public processWebhookSubscribeResponse(
        dto: ResponseDto,
        _applicationInstall: ApplicationInstall,
    ): string {
        const body = dto.getJsonBody() as { id?: string };
        return body?.id ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    public getWebhookUnsubscribeRequestDto(
        _applicationInstall: ApplicationInstall,
        webhook: Webhook,
    ): RequestDto {
        const request = new RequestDto(
            `${MOCK_SERVER_URL}/webhooks/unsubscribe/${webhook.getWebhookId() || 'unknown'}`,
            HttpMethods.POST,
            new ProcessDto(),
        );
        logger.info(`[webhook-test] unsubscribe for [${webhook.getName()}] (id=${webhook.getWebhookId()})`, {});
        return request;
    }

    public processWebhookUnsubscribeResponse(_dto: ResponseDto): boolean {
        return true;
    }

}
