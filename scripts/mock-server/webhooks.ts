/* eslint-disable no-console */
/**
 * Webhook registry + delivery for the unified mock server.
 *
 * Simulates a remote webhook provider: it accepts subscribe / unsubscribe
 * calls from the worker's `WebhookTestApplication` and, for every active
 * registration, POSTs a small test payload to the stored callback URL once a
 * minute. The callback URL is the Orchesty starting-point URL the SDK builds
 * at subscribe time, so the delivery actually triggers the bound topology.
 */

const DELIVERY_INTERVAL_MS = Number(process.env.MOCK_WEBHOOK_INTERVAL_MS ?? 60_000);

interface IRegistration {
    id: string;
    event: string;
    callback: string;
    parameters: Record<string, unknown>;
    createdAt: string;
    deliveries: number;
    timer: NodeJS.Timeout;
}

const registrations = new Map<string, IRegistration>();

function randomId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function deliver(reg: IRegistration): Promise<void> {
    const payload = {
        action: reg.event,
        timestamp: new Date().toISOString(),
    };
    try {
        const resp = await fetch(reg.callback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        reg.deliveries += 1;
        console.log(
            `[mock-webhook] delivered #${reg.deliveries} event=[${reg.event}] `
                + `-> ${reg.callback} (HTTP ${resp.status})`,
        );
    } catch (err) {
        console.warn(`[mock-webhook] delivery failed for [${reg.event}] -> ${reg.callback}: ${(err as Error).message}`);
    }
}

/**
 * Registers a webhook and starts a recurring delivery timer. Returns the
 * external webhook id the worker stores as `Webhook.webhookId`.
 */
export function subscribe(event: string, callback: string, parameters: Record<string, unknown> = {}): string {
    const id = randomId();
    const timer = setInterval(() => {
        void deliver(registrations.get(id) ?? ({} as IRegistration));
    }, DELIVERY_INTERVAL_MS);
    // Don't keep the event loop alive solely for the timer.
    timer.unref?.();

    const reg: IRegistration = {
        id,
        event,
        callback,
        parameters,
        createdAt: new Date().toISOString(),
        deliveries: 0,
        timer,
    };
    registrations.set(id, reg);

    console.log(`[mock-webhook] subscribed [${event}] id=${id} -> ${callback} (every ${DELIVERY_INTERVAL_MS} ms)`);
    return id;
}

/** Removes a registration and stops its delivery timer. */
export function unsubscribe(id: string): boolean {
    const reg = registrations.get(id);
    if (!reg) {
        return false;
    }
    clearInterval(reg.timer);
    registrations.delete(id);
    console.log(`[mock-webhook] unsubscribed id=${id} (event=[${reg.event}])`);
    return true;
}

/** Fires a single delivery immediately (handy for demos without waiting). */
export async function trigger(id: string): Promise<boolean> {
    const reg = registrations.get(id);
    if (!reg) {
        return false;
    }
    await deliver(reg);
    return true;
}

/** Serializable snapshot of active registrations (for the debug endpoint). */
export function list(): Array<Omit<IRegistration, 'timer'>> {
    return Array.from(registrations.values()).map(({ timer, ...rest }) => rest);
}

/** Clears all timers — used on graceful shutdown. */
export function stopAll(): void {
    for (const reg of registrations.values()) {
        clearInterval(reg.timer);
    }
    registrations.clear();
}
