import { ApplicationInstall } from '@orchesty/nodejs-sdk/dist/lib/Application/Database/ApplicationInstall';
import Field from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Field';
import FieldType from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FieldType';
import Form from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/Form';
import FormStack from '@orchesty/nodejs-sdk/dist/lib/Application/Model/Form/FormStack';
import { ABasicApplication } from '@orchesty/nodejs-sdk/dist/lib/Authorization/Type/Basic/ABasicApplication';
import RequestDto from '@orchesty/nodejs-sdk/dist/lib/Transport/Curl/RequestDto';
import { HttpMethods } from '@orchesty/nodejs-sdk/dist/lib/Transport/HttpMethods';
import AProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/AProcessDto';

export const NAME = 'forms-demo';

// Form keys — the top-level keys under applicationInstall.getSettings().
export const MESSAGE_SETTINGS = 'message_settings';
export const OUTPUT_SETTINGS = 'output_settings';

// Field keys for the "Message settings" form.
export const F_GREETING = 'greeting';
export const F_LANGUAGE = 'language';
export const F_SHOUT = 'shout';

// Field keys for the "Output settings" form.
export const F_WRAP = 'wrap';
export const F_ADD_TIMESTAMP = 'add_timestamp';
export const F_SIGNATURE = 'signature';

/**
 * Forms Demo — a self-contained playground for practising custom settings
 * forms and mapper custom nodes. It performs no HTTP calls and needs no real
 * authorization.
 *
 * It exposes two custom settings forms:
 *   - "Message settings" (text + select + checkbox) — consumed by MessageBuilder
 *   - "Output settings"  (select + checkbox + text) — consumed by MessageFormatter
 *
 * The two custom nodes read these settings via
 * `getApplicationInstallFromProcess()`, so changing a form value in the UI is
 * immediately visible in the topology output.
 */
export default class FormsDemoApplication extends ABasicApplication {

    public getName(): string {
        return NAME;
    }

    public getPublicName(): string {
        return 'Forms Demo';
    }

    public getDescription(): string {
        return 'Playground application: two custom settings forms drive two mapper custom nodes. No external API.';
    }

    // No real credentials — the app is always usable so the settings forms can
    // be filled and exercised right away.
    public isAuthorized(_applicationInstall: ApplicationInstall): boolean {
        return true;
    }

    public getFormStack(): FormStack {
        const messageForm = new Form(MESSAGE_SETTINGS, 'Message settings')
            .addField(new Field(FieldType.TEXT, F_GREETING, 'Greeting word', 'Hello', true))
            .addField(
                new Field(FieldType.SELECT_BOX, F_LANGUAGE, 'Language', 'en', true)
                    .setChoices(['en', 'cs', 'de']),
            )
            .addField(new Field(FieldType.CHECKBOX, F_SHOUT, 'Shout (UPPERCASE)', false));

        const outputForm = new Form(OUTPUT_SETTINGS, 'Output settings')
            .addField(
                new Field(FieldType.SELECT_BOX, F_WRAP, 'Wrap style', 'none', true)
                    .setChoices(['none', 'brackets', 'quotes']),
            )
            .addField(new Field(FieldType.CHECKBOX, F_ADD_TIMESTAMP, 'Append timestamp', true))
            .addField(new Field(FieldType.TEXT, F_SIGNATURE, 'Signature', '— Orchesty'));

        return new FormStack().addForm(messageForm).addForm(outputForm);
    }

    // Not used by this demo (no outbound HTTP), but the contract requires it.
    public getRequestDto(
        dto: AProcessDto,
        _applicationInstall: ApplicationInstall,
        method: HttpMethods,
        url?: string,
    ): RequestDto {
        return new RequestDto(url ?? 'http://localhost', method, dto);
    }

}
