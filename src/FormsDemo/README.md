# Forms Demo

A self-contained playground for practising **custom settings forms** and
**mapper custom nodes**. No external API, no real authorization — install the
app, fill the forms, run the topology, and watch the payload change.

## Components

| Element | Type | What it does |
|-----|---|---|
| `FormsDemoApplication` (`forms-demo`) | Application | Exposes two custom settings forms. No HTTP, `isAuthorized()` is always `true`. |
| `MessageBuilder` (`forms-demo-message-builder`) | Custom node | Seeds a default payload and applies the **Message settings** form. |
| `MessageFormatter` (`forms-demo-message-formatter`) | Custom node | Applies the **Output settings** form to the message from upstream. |

## Forms

**Message settings** (`message_settings`) — consumed by `MessageBuilder`:

| Field | Key | Type | Default |
|---|---|---|---|
| Greeting word | `greeting` | text | `Hello` |
| Language | `language` | select (`en`, `cs`, `de`) | `en` |
| Shout (UPPERCASE) | `shout` | checkbox | `false` |

**Output settings** (`output_settings`) — consumed by `MessageFormatter`:

| Field | Key | Type | Default |
|---|---|---|---|
| Wrap style | `wrap` | select (`none`, `brackets`, `quotes`) | `none` |
| Append timestamp | `add_timestamp` | checkbox | `true` |
| Signature | `signature` | text | `— Orchesty` |

## How a custom node reads form settings

Custom nodes normally don't need an application, but to read form settings they
**must** be registered with one (2nd argument to `setNode`):

```typescript
container.setNode(new MessageBuilder(), formsDemoApp);
```

Inside `processAction` the settings are loaded from the application install
(this makes the method `async`):

```typescript
const settings = (await this.getApplicationInstallFromProcess(dto)).getSettings();
const form = settings[MESSAGE_SETTINGS] ?? {};
const greeting = form[F_GREETING] as string;
```

Checkbox values can arrive as a boolean or the string `"true"`, so coerce them:
`form[F_SHOUT] === true || form[F_SHOUT] === 'true'`.

## Topology

`src/topologies/demo-forms.tplg.json`:

```
[Event] → [message-builder] → [message-formatter]
```

## Payload flow (with default form values)

| Step | Node | Input | Output |
|---|---|---|---|
| — | Event trigger | — | `{}` |
| 1 | `message-builder` | `{}` | `{ "name": "World", "language": "en", "message": "Hello, World!" }` |
| 2 | `message-formatter` | ↑ | `{ "name": "World", "language": "en", "message": "Hello, World! — Orchesty", "formattedAt": "2026-…" }` |

You can also send `{ "id": … }`-style start payloads; provide `{ "name": "Alice" }`
to override the default name.

## See the forms take effect

Change a value in the app's settings and re-run the topology:

| Change | Result |
|---|---|
| `shout = true` | step 1 message becomes `HELLO, WORLD!` |
| `greeting = "Ahoj"`, `language = cs` | `Ahoj, World!` |
| `wrap = quotes` | `"Hello, World!" — Orchesty` |
| `wrap = brackets` | `[Hello, World!] — Orchesty` |
| `add_timestamp = false` | `formattedAt` disappears from the output |
| `signature = ""` | no signature appended |

Attach a breakpoint after either node to inspect the payload at that step.
