# AGENTS.md

Entry point for AI agents working in this repository. It is deliberately short: load only the document that matches the work you are about to do (table below) instead of reading everything.

## Purpose

Pure backend template in TypeScript with hexagonal architecture, a Bun-native HTTP adapter when running on Bun, an Express HTTP adapter when running on Node.js, `pino` for logging, and manual wiring.
Node compatibility is intentionally preserved, but Bun is the preferred runtime for local work.

## Stack and commands

Bun · Node.js 24+ · TypeScript (strict) · Express · Zod · Pino / Pino HTTP · Vitest · ESLint · dprint.

- `bun install` · `bun run dev` · `bun run start` · `bun run build`
- `bun run lint` (ESLint + `scripts/dead-code.mjs`) · `bun run test` · `bun run test:coverage`
- `bun run format` · `bun run format:write`
- Node fallback: `npm run dev:node`, `npm run start:node`, and the same `build`, `lint`, `test`, `format` scripts through `npm run`.

After code changes run `bun run build` and `bun run lint`; when behaviour changes also `bun run test` (coverage is enforced at 100%).

## Rules that always apply

- **No dead code.** Delete what stops being used in the same change: functions, exports, files, ports, env vars, dependencies, docs. No commented-out code, no TODOs, nothing kept "just in case" or only for tests. `bun run lint` fails on it. Details: [docs/conventions.md](docs/conventions.md#no-dead-code).
- Keep `domain` / `application` / `infrastructure` / `app`: `domain` never depends on frameworks, Express, env or adapters; `application` depends on ports only; `app` is wiring only. HTTP features are runtime-agnostic `HttpModule` definitions so Bun and Express behave the same.
- Use the `Logger` port; never `console.log` in application or infrastructure code.
- Formatting is `dprint` (same config across this template family and the rest of the projects): single quotes, no trailing commas, 140 columns, one import per line, LF line endings. Never Prettier.
- Test-only helpers, resets and fixtures stay out of `src/**`.
- Keep Node.js portability; CI validates both Node.js and Bun.

## Load context on demand

| If you are touching…                                                         | Read                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| Layers, composition points, HTTP modules, adding a feature, env vars, Docker | [docs/architecture.md](docs/architecture.md) |
| Code conventions, logging, tests, the dead-code rule                         | [docs/conventions.md](docs/conventions.md)   |
| What the template is for and how a human uses it                             | [README.md](README.md)                       |

## Documentation upkeep

- `README.md` is for human developers; `AGENTS.md` is the short agent entry point; `docs/*.md` hold the detail loaded on demand.
- When behaviour, runtime preference, architecture rules, scripts, environment variables, endpoints, logging, adapters or conventions change, update this file, `README.md` and the matching `docs/` file in the same change.
- Keep this file short: detail belongs in `docs/`, and a document nobody links from here is deleted.
