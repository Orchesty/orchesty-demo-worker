# Orchesty Node.js Bootstrap

A ready-to-fork starter template for building [Orchesty](https://orchesty.io) integration workers in Node.js + TypeScript. It ships with the [`@orchesty/nodejs-sdk`](https://www.npmjs.com/package/@orchesty/nodejs-sdk), a Make-driven dev workflow, a multi-stage production `Dockerfile`, and the [`@orchesty/nodejs-ai`](https://github.com/Orchesty/orchesty-nodejs-ai) rules package so AI coding assistants (Cursor, Claude Code, Windsurf, GitHub Copilot, Cline, Aider, ...) generate code that matches Orchesty conventions out of the box.

## Quickstart with AI tools (Cursor, Claude Code, ...)

This is the recommended path. Open your AI coding tool inside an empty folder and paste the prompt below. The agent does the rest: clones the repo, installs dependencies, materializes the AI rules into its own rule directory, and starts building the integration you describe.

```
Bootstrap an Orchesty integration worker in the current directory.

1. Clone https://github.com/Orchesty/orchesty-nodejs-bootstrap.git into the current directory (no `my-worker` subfolder), then `rm -rf .git && git init`.
2. Open AGENTS.md and follow its "Setup workflow" section in order. It picks between local Node.js and Docker based on what's available on the host (and asks me if both work), brings up the project, materializes the AI rules into your tool's native rule directory, and verifies the build.

Then build the integration described below.
```

Append your integration brief at the bottom of the prompt before sending it. Per-tool rule paths and update flow are documented in [`node_modules/@orchesty/nodejs-ai/AI-INSTRUCTIONS.md`](https://github.com/Orchesty/orchesty-nodejs-ai/blob/master/AI-INSTRUCTIONS.md) once the package is installed.

## Manual quickstart (without AI)

```bash
git clone https://github.com/Orchesty/orchesty-nodejs-bootstrap.git my-worker
cd my-worker
rm -rf .git && git init
make init-dev          # installs deps, generates .env, starts the dev server
```

Docker variant (no local Node.js required):

```bash
make init-dev-docker
```

That's the entire setup. The AI rule files in `node_modules/@orchesty/nodejs-ai/rules/` only matter when you drive the codebase with an AI coding assistant. For plain manual development you can ignore them.

## Project structure

```
.
├── src/
│   └── index.ts            # Worker entry point: register Applications and Nodes here
├── .jest/                  # Jest setup helpers
├── docker/                 # Dev container support files
├── docker-compose.yaml     # Dev container definition (used by `make init-dev-docker`)
├── Dockerfile              # Multi-stage production image (used by `make build IMAGE=...`)
├── Makefile                # Canonical entry point. See "Make targets" below
├── AGENTS.md               # Setup workflow for AI agents (Cursor, Claude Code, ...)
├── .env.dist               # Template; `make` auto-generates `.env` from this on first run
├── package.json
└── tsconfig*.json
```

## Make targets


| Target                               | What it does                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| `make install`                       | Installs dependencies (auto-detects `pnpm`/`npm`).                  |
| `make start`                         | Runs the dev server (`nodemon src/index.ts`). Blocking.             |
| `make init-dev`                      | `install` + `start` in one shot. Auto-generates `.env`.             |
| `make test`                          | Lint + unit tests.                                                  |
| `make lint`                          | ESLint with `--fix`.                                                |
| `make build IMAGE=registry/name:tag` | Builds and pushes the multi-stage production image (`linux/amd64`). |


Docker variants run the same operations inside the dev container defined in `docker-compose.yaml`:


| Target                   | What it does                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `make init-dev-docker`   | `docker compose up` + install + start, all inside the container.                             |
| `make install-docker`    | `pnpm install` inside the worker container.                                                  |
| `make start-docker`      | Runs the dev server inside the container.                                                    |
| `make test-docker`       | Brings up containers, runs lint + tests, then tears them down with `docker compose down -v`. |
| `make docker-down-clean` | Stops the dev container and deletes its volumes.                                             |


## Docker workflow

`make init-dev-docker` is the one-liner for the volume-mounted dev container. Code changes on the host trigger nodemon inside the container. The root `Dockerfile` is the multi-stage production build; build and push it with `make build IMAGE=registry/name:tag`.

## How AI rules work

Rules ship as the npm package [`@orchesty/nodejs-ai`](https://github.com/Orchesty/orchesty-nodejs-ai), pinned in `package.json` as a dev dependency. When you use this template with an AI coding assistant, [AGENTS.md](AGENTS.md) tells the agent to materialize the `.mdc` rule files from `node_modules/@orchesty/nodejs-ai/rules/` into the tool's native rule directory; per-tool snippets (Cursor's `.cursor/rules/`, Claude Code's `CLAUDE.md`, Windsurf's `.windsurfrules`, etc.) live in [`node_modules/@orchesty/nodejs-ai/AI-INSTRUCTIONS.md`](https://github.com/Orchesty/orchesty-nodejs-ai/blob/master/AI-INSTRUCTIONS.md). You don't have to do this by hand.

To pull rule updates: `pnpm update @orchesty/nodejs-ai`, then ask your AI tool to re-run the AGENTS.md setup workflow (or copy the refreshed `.mdc` files yourself if you prefer).

## Documentation

- [Orchesty platform docs](https://docs.orchesty.io/)
- [`@orchesty/nodejs-sdk` on npm](https://www.npmjs.com/package/@orchesty/nodejs-sdk)
- [Pre-built `@orchesty/connector-*` packages](https://www.npmjs.com/search?q=%40orchesty%2Fconnector)
- [Connector source examples](https://github.com/Orchesty/orchesty-nodejs-connectors/tree/master/lib)

## Community

- [Discord](https://discord.gg/orchesty)
- [GitHub Discussions](https://github.com/Orchesty/orchesty-nodejs-bootstrap/discussions)
- Issues and pull requests welcome. Please run `make test` before opening a PR.

## License

Apache-2.0. See [LICENSE](LICENSE).