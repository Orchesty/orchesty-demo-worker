import AQuestion, { IQuestionSchema } from '@orchesty/nodejs-sdk/dist/lib/Question/AQuestion';
import ProcessDto from '@orchesty/nodejs-sdk/dist/lib/Utils/ProcessDto';

export const NAME = 'pulse-demo-ask-name';

export default class AskNameQuestion extends AQuestion {

    public getName(): string {
        return NAME;
    }

    public getQuestion(): string {
        return 'What is your name?';
    }

    public getSchema(): IQuestionSchema {
        return {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name of the user.',
                },
            },
            required: ['name'],
        };
    }

    public shouldSkip(dto: ProcessDto): boolean {
        const { name } = dto.getJsonData() as { name?: unknown };

        return typeof name === 'string' && name.trim().length > 0;
    }

}
