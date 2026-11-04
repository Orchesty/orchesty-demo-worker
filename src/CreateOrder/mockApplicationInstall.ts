import { mockAdapter } from '@orchesty/nodejs-sdk/dist/test/MockServer';

const installs = new Map<string, Record<string, unknown>>();
let hooked = false;

function applicationName(url: string): string | undefined {
    let decoded: string;
    try {
        decoded = decodeURIComponent(url);
    } catch {
        decoded = url;
    }
    return /"names":\["(?<name>[^"]+)"\]/.exec(decoded)?.groups?.name;
}

export function registerApplicationInstall(name: string, settings: Record<string, unknown>): void {
    installs.set(name, {
        user: 'user',
        key: name,
        sdk: 'sdk',
        enabled: true,
        encryptedSettings: '',
        settings,
    });

    if (hooked) {
        return;
    }
    hooked = true;

    mockAdapter.onGet(/\/document\/ApplicationInstall/).reply((config) => {
        const nameFromUrl = applicationName(config.url ?? '');
        const install = nameFromUrl ? installs.get(nameFromUrl) : undefined;
        return [200, install ? [install] : []];
    });
}
