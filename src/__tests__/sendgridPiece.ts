import ANode from '@orchesty/nodejs-sdk/dist/lib/Commons/ANode';

interface Named {
    getName(): string;
}

class FakeRegistry {

    public readonly applications = new Map<string, Named>();

    public readonly nodes = new Map<string, Named>();

    public setApplication(application: unknown): unknown {
        const named = application as Named;
        this.applications.set(named.getName(), named);
        return application;
    }

    public setNode(node: unknown, application?: unknown): unknown {
        if (application && node instanceof ANode) {
            node.setApplication(application as never);
        }
        const named = node as Named;
        this.nodes.set(named.getName(), named);
        return node;
    }

}

function loadSendgrid(): {
    sendgrid: unknown;
    registerPiece(registry: FakeRegistry, piece: unknown, options: {
        name: string;
        publicName: string;
    }): Named;
} | null {
    try {
        // Optional playground dep — skip when the piece is not installed.
        // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
        const { sendgrid } = require('@activepieces/piece-sendgrid');
        // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
        const { registerPiece } = require('@orchesty/activepieces-adapter');
        return { sendgrid, registerPiece };
    } catch {
        return null;
    }
}

const loaded = loadSendgrid();

describe('SendGrid piece registration', () => {
    it('registers the sendgrid application and sendgrid-send-email', () => {
        if (!loaded) {
            throw new Error('SendGrid piece is not installed');
        }
        const registry = new FakeRegistry();
        const app = loaded.registerPiece(registry, loaded.sendgrid, {
            name: 'sendgrid',
            publicName: 'SendGrid',
        });

        expect(app.getName()).toBe('sendgrid');
        expect(registry.applications.has('sendgrid')).toBe(true);
        expect(registry.nodes.has('sendgrid-send-email')).toBe(true);
        expect(registry.nodes.has('sendgrid-refresh-props')).toBe(false);
    });
});
