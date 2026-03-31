# AGENTS.md

Short operational guide for AI agents working in this repository.

## Purpose

Pure backend template in TypeScript with hexagonal architecture, a Bun-native HTTP adapter when running on Bun, an Express HTTP adapter when running on Node.js, `pino` for logging, and manual wiring.
Node compatibility is intentionally preserved, but Bun is the preferred runtime for local work.

## Stack and commands

- Bun
- Node.js 20+
- Strict TypeScript
- Express
- Zod
- Pino / Pino HTTP
- Vitest

Preferred commands:

- `bun install`
- `bun run dev`
- `bun run start`
- `bun run build`
- `bun run lint`
- `bun run test`
- `bun run test:coverage`
- `bun run format`
- `bun run format:write`

Container packaging preference:

- Prefer Bun-based Docker images for this repository unless a concrete compatibility requirement forces a Node image.
- Keep Node.js support in the codebase and scripts, but do not switch the default container runtime back to Node without an explicit reason.

Fallback commands:

- `npm run dev:node`
- `npm run start:node`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:coverage`
- `npm run format`
- `npm run format:write`

## Architecture rules

- Keep the `domain` / `application` / `infrastructure` / `app` structure.
- Preserve Node portability unless the project explicitly decides to adopt Bun-only features.
- Prefer Bun for local development, script execution, and fast validation when there is no reason to use Node/npm.
- Prefer Bun for Docker build and runtime stages too, unless a specific deployment environment requires Node-based images.
- Keep HTTP features expressed through runtime-agnostic `HttpModule` definitions so Bun and Express stay behaviorally aligned.
- `domain` must not depend on frameworks, Express, environment variables, or concrete adapters.
- `application` orchestrates use cases and depends on ports, not on infrastructure implementations.
- `infrastructure` contains concrete adapters.
- `app` is composition and wiring only. Keep `createApp.ts` and `createBunServer.ts` thin. Do not move business logic there.

Important composition points:

- Shared dependencies: `src/app/modules/SharedModuleDependencies.ts`
- Main wiring: `src/app/createContainer.ts`
- Application module registration: `src/app/composition/createApplicationModules.ts`
- Runtime selector: `src/app/startHttpServer.ts`
- Bun adapter: `src/app/createBunServer.ts`
- Express adapter: `src/app/createApp.ts`
- HTTP module registration: `src/infrastructure/http/modules/index.ts`

## Adding a feature

1. Add model and rules in `src/domain/<feature>`.
2. Add use cases and ports in `src/application/<feature>`.
3. Implement adapters in `src/infrastructure/...`.
4. Register the module in `src/app/modules/...` and `src/app/composition/createApplicationModules.ts`.
5. If it exposes HTTP, add or update an `HttpModule` and register it in `src/infrastructure/http/modules/index.ts`.

If you add environment variables:

- update `src/infrastructure/config/env.ts`
- update `.env.example`

## Code conventions

- In `src/**`, keep explicit types and respect the strict typing already configured.
- Prefer compact, readable code over decorative whitespace.
- One import per line. Avoid multiline imports unless they are truly necessary.
- Use 120 characters as the normal width. Short signatures, imports, conditions, and small objects can stay on one line.
- Avoid empty lines inside very short methods or functions when they do not add clarity.
- Do not leave an extra blank line after the final block in a file. A normal final newline is fine.
- Add comments only when they provide real context.
- Formatting is handled by `dprint`, not Prettier.
- Prefer repository-level `dprint.json` changes over scattered formatter-ignore comments.
- If formatting must be bypassed for a real edge case, use a narrow `dprint-ignore` only on that specific code.

## Logging

- Use the `Logger` abstraction from `src/application/shared/ports/Logger.ts`.
- Do not introduce `console.log` in application or infrastructure code.
- For logging context, prefer child loggers with bindings such as `module`, `useCase`, and `component`.
- Console output is intentionally compact and Spring-like.
- HTTP logs stay compact at `info` and include request/response headers and bodies at `debug` / `trace`.

## Tests and validation

- Unit tests live in `tests/unit`.
- Integration tests live in `tests/integration`.
- CI validates both Node.js and Bun. Keep both paths green when changing dependencies or runtime-sensitive code.
- After code changes, run at least `bun run build` and `bun run lint` when Bun is available.
- If behavior changes, add or update tests and run `bun run test`.
- If coverage is affected, keep `bun run test:coverage` green.

## Documentation upkeep

- `README.md` is for human developers.
- `AGENTS.md` is for AI operational context.
- Whenever a relevant behavior, runtime preference, architecture rule, script, environment variable, endpoint, logging behavior, adapter, or coding convention changes, update the affected documentation in the same change.
- Keep this file short, repository-specific, and practical.
