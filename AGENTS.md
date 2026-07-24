# Orchesty Worker — AI Instructions

This template ships with the [`@orchesty/nodejs-ai`](https://github.com/Orchesty/orchesty-nodejs-ai) package as a dev dependency. It carries the AI coding rules that teach assistants how to build Applications, Connectors, Batches, CustomNodes, tests, and topology files for the Orchesty platform.

## Setup workflow

Execute these steps in order before generating integration code. The repo's [Makefile](Makefile) auto-detects `pnpm`/`npm` and generates `.env` from `.env.dist`, so you don't need to manage either by hand.

1. **Decide local vs Docker.** Run `node --version` and `docker --version` (silently) to see what's installed:
   - **Only Node.js (>= 20):** use the local path.
   - **Only Docker:** use the Docker path.
   - **Both available:** ask the user once, in a single line: *"Run the worker locally with Node.js (faster feedback loop) or in Docker (isolated, no local Node.js needed)?"* Default to local if the user doesn't answer. Note: a user can always override this in their initial brief, e.g. "use Docker" — honour that and skip the question.
   - **Neither:** stop and tell the user to install Node.js 20+ or Docker before continuing.
2. **Bring up the project.**
   - **Local path:**
     - Preferred (if your tool can run shell commands in the background): `make init-dev`. Installs deps and starts the dev server (nodemon) in one shot. Continue with the next steps while it runs in the background.
     - Fallback (no backgrounding): `make install` only. Run `make start` later, after this workflow finishes.
   - **Docker path:** `make init-dev-docker`. Builds the dev container, installs deps inside it, and starts the worker. Same backgrounding caveat applies.
3. **Materialize the rules into your AI tool.** Open [`node_modules/@orchesty/nodejs-ai/AI-INSTRUCTIONS.md`](node_modules/@orchesty/nodejs-ai/AI-INSTRUCTIONS.md) and run the copy/concat snippet for the tool you're using (Cursor, Claude Code, Windsurf, GitHub Copilot, Cline, Aider, ...). Without this step the next phase won't have the architectural / naming / connector rules active.
4. **Verify.** Run `make test` (or `make test-docker` if you went the Docker path). Lint + unit tests must pass before writing integration code.

## After updating the rules package

When you bump `@orchesty/nodejs-ai` (`pnpm update @orchesty/nodejs-ai`), re-run the copy/concat snippet from [AI-INSTRUCTIONS.md](node_modules/@orchesty/nodejs-ai/AI-INSTRUCTIONS.md) so the materialized rules in `.cursor/rules/`, `CLAUDE.md`, `.windsurfrules`, etc. reflect the latest content.

## Rules

The rule files live in [`node_modules/@orchesty/nodejs-ai/rules/`](node_modules/@orchesty/nodejs-ai/rules/). The per-rule list and YAML-frontmatter conventions are documented in the package's [README](https://github.com/Orchesty/orchesty-nodejs-ai).
