# Architecture

Read this before changing layers, composition, HTTP modules, runtime adapters or environment variables.

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

## Container packaging

- Prefer Bun-based Docker images for this repository unless a concrete compatibility requirement forces a Node image.
- Keep Node.js support in the codebase and scripts, but do not switch the default container runtime back to Node without an explicit reason.
