# Hexagonal Backend Template in TypeScript

<details open>
<summary>English</summary>

Pure backend template with hexagonal architecture in TypeScript, designed to stay portable on Node.js while preferring Bun for local development and day-to-day execution.

Node compatibility is intentionally preserved so the template stays broadly reusable, but unless there is a concrete restriction, `bun` is the recommended runtime for both ergonomics and overall runtime performance. When the process runs on Bun, the template uses a Bun-native HTTP adapter. When it runs on Node.js, it falls back to Express.

## What is included

- `layer-first` structure: `domain`, `application`, and `infrastructure` at the top of the tree
- Runtime-selected HTTP bootstrap: Bun-native on Bun, Express on Node
- Typed environment configuration with `zod`
- Logging with `pino`
- Centralized error handling
- Manual dependency wiring, without a magic container
- Complete working `users` example
- Operational `health` endpoint, separated from business modules
- Unit and integration tests with `vitest` and `supertest`
- GitHub Actions CI validating both Node.js and Bun
- `Dockerfile`, GitHub Actions CI, ESLint, and dprint

## Stack

- Bun
- Node.js 20+
- Strict TypeScript
- Express
- Zod
- Pino
- Vitest

## Structure

```text
src/
  app/
    createApp.ts
    createBunServer.ts
    createContainer.ts
    startHttpServer.ts
  domain/
    shared/
    system/
    users/
  application/
    shared/
    system/
    users/
  infrastructure/
    config/
    http/
      HttpModule.ts
      modules/
      routes/
    logging/
    persistence/
    system/
tests/
  unit/
  integration/
```

## Layers

### Domain

This is where the pure business rules live. It does not know about Express, databases, environment variables, or technical infrastructure details. In the example:

- `User` is the aggregate root
- `UserId`, `UserName`, and `UserEmail` are value objects
- `UserCreatedEvent` shows how to model domain events
- `UserRepository` defines the port later implemented by infrastructure
- `HealthStatus` lives in `domain/system` because it represents an operational concern, not a business module

### Application

This layer coordinates use cases and depends only on ports. In the example:

- `CreateUserUseCase`
- `GetUserByIdUseCase`
- `ListUsersUseCase`
- `GetHealthStatusUseCase`

This layer orchestrates business validations, transactions, domain event publication, and logging through interfaces.

### Infrastructure

This layer implements concrete adapters. In the template:

- Bun-native HTTP adapter for Bun and Express adapter for Node, both backed by shared `HttpModule` definitions
- `InMemoryUserRepository` as a persistence example
- `PinoLogger`, `NodeClock`, `NodeIdGenerator`
- HTTP error and not-found middlewares
- HTTP routes grouped under `src/infrastructure/http/routes`

## How to run it

With Bun:

```bash
cp .env.example .env
bun install
bun run dev
```

`bun run dev` and `bun run start` use the Bun-native HTTP adapter because the process runs on Bun.

With Node/npm:

```bash
cp .env.example .env
npm install
npm run dev:node
```

`npm run dev:node` and `npm run start:node` run on Node.js and therefore use the Express adapter.
`package-lock.json` and `bun.lock` are intentionally not tracked.

Available scripts:

- `bun run dev`
- `bun run dev:node`
- `bun run build`
- `bun run start`
- `bun run start:node`
- `bun run test`
- `bun run test:coverage`
- `bun run lint`
- `bun run format`
- `bun run format:write`
- `npm run dev:node`
- `npm run build`
- `npm run start:node`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format`
- `npm run format:write`

## Docker

The repository includes a Bun-based multi-stage `Dockerfile`.

- build stage: `Bun`
- runtime stage: `Bun`
- default container runtime: Bun-native HTTP adapter

Build example:

```bash
docker build -t hexagonal-backend-template-ts .
```

Run example:

```bash
docker run --rm -p 3000:3000 --env-file .env hexagonal-backend-template-ts
```

The container exposes the backend on port `3000`.
Node portability remains available in the repository, but the default image is Bun-first.

## Example endpoints

```http
GET    /health
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
```

Creation example:

```bash
curl --request POST \
  --url http://localhost:3000/api/v1/users \
  --header 'content-type: application/json' \
  --data '{
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  }'
```

## How to extend the template

1. Create the domain model in `src/domain/<feature>`.
2. Implement use cases in `src/application/<feature>`.
3. Connect adapters in `src/infrastructure`.
4. Register dependencies in `src/app/createContainer.ts`.
5. Add or update an `HttpModule` under `src/infrastructure/http` and let both runtime adapters consume it.

## What to replace in a real project

- `InMemoryUserRepository` with a real adapter for Postgres, MySQL, MongoDB, Redis, or the storage you use
- `NoopTransactionManager` with a real implementation if your persistence supports transactions
- The `users` folder with your real bounded contexts
- The HTTP endpoints with REST, gRPC, jobs, queues, or the input adapter you actually need

## Design decisions

- Wiring is manual on purpose: it reduces magic and keeps dependencies obvious
- The example uses an in-memory repository so the template can run without external infrastructure
- The domain does not depend on frameworks
- The structure is intentionally layer-oriented to prioritize architectural readability in small and medium projects
- `health` does not hang from business modules: it is treated as an operational system concern
- HTTP adapters are runtime-specific, but the route definitions are shared so Bun and Express expose the same behavior
- The structure is intentionally backend-only and optimized for clear service boundaries
- Test-only resets, fixtures, mocks, and similar helpers stay in `tests/**` or test setup, not in `src/**`, unless they are real runtime dependency boundaries
- Runtime code should clean up listeners, timers, intervals, streams, sockets, and similar resources, and should avoid unbounded process-global caches or stores unless that boundary is intentional

</details>

<details>
<summary>Español</summary>

Template de backend puro con arquitectura hexagonal en TypeScript, pensado para correr de forma portable sobre Node.js pero con preferencia práctica por Bun en desarrollo local y ejecución diaria.

La compatibilidad con Node se mantiene para que el template sea más universal, pero si no hay una restricción concreta, la opción recomendada es usar `bun`, tanto por ergonomía como por performance general del runtime. Cuando el proceso corre sobre Bun, el template usa un adapter HTTP nativo de Bun. Cuando corre sobre Node.js, hace fallback a Express.

## Qué incluye

- Estructura `layer-first`: `domain`, `application` e `infrastructure` al tope del árbol
- Bootstrap HTTP seleccionado por runtime: nativo de Bun en Bun y Express en Node
- Configuración tipada por entorno con `zod`
- Logging con `pino`
- Manejo centralizado de errores
- Wiring manual de dependencias, sin contenedor mágico
- Ejemplo funcional completo con `users`
- Endpoint operativo `health`, separado del área de negocio
- Tests unitarios e integración con `vitest` y `supertest`
- GitHub Actions CI validando tanto Node.js como Bun
- `Dockerfile`, CI de GitHub Actions, ESLint y dprint

## Stack

- Bun
- Node.js 20+
- TypeScript estricto
- Express
- Zod
- Pino
- Vitest

## Estructura

```text
src/
  app/
    createApp.ts
    createBunServer.ts
    createContainer.ts
    startHttpServer.ts
  domain/
    shared/
    system/
    users/
  application/
    shared/
    system/
    users/
  infrastructure/
    config/
    http/
      HttpModule.ts
      modules/
      routes/
    logging/
    persistence/
    system/
tests/
  unit/
  integration/
```

## Capas

### Domain

Acá viven las reglas del negocio puras. No conoce Express, base de datos, variables de entorno ni detalles técnicos. En el ejemplo:

- `User` es el aggregate root
- `UserId`, `UserName` y `UserEmail` son value objects
- `UserCreatedEvent` muestra cómo modelar eventos de dominio
- `UserRepository` define el puerto que luego implementa infraestructura
- `HealthStatus` vive en `domain/system` porque representa un concern operativo, no un módulo de negocio

### Application

Coordina casos de uso y depende solo de puertos. En el ejemplo:

- `CreateUserUseCase`
- `GetUserByIdUseCase`
- `ListUsersUseCase`
- `GetHealthStatusUseCase`

Esta capa orquesta validaciones de negocio, transacciones, publicación de eventos y logging a través de interfaces.

### Infrastructure

Implementa adapters concretos. En el template:

- Adapter HTTP nativo de Bun para Bun y adapter de Express para Node, ambos apoyados sobre definiciones compartidas de `HttpModule`
- `InMemoryUserRepository` como ejemplo de persistencia
- `PinoLogger`, `NodeClock`, `NodeIdGenerator`
- middlewares HTTP de errores y not-found
- rutas HTTP agrupadas en `src/infrastructure/http/routes`

## Cómo correrlo

Con Bun:

```bash
cp .env.example .env
bun install
bun run dev
```

`bun run dev` y `bun run start` usan el adapter HTTP nativo de Bun porque el proceso corre sobre Bun.

Con Node/npm:

```bash
cp .env.example .env
npm install
npm run dev:node
```

`npm run dev:node` y `npm run start:node` corren sobre Node.js y por eso usan el adapter de Express.
`package-lock.json` y `bun.lock` están intencionalmente fuera de control de versiones.

Scripts disponibles:

- `bun run dev`
- `bun run dev:node`
- `bun run build`
- `bun run start`
- `bun run start:node`
- `bun run test`
- `bun run test:coverage`
- `bun run lint`
- `bun run format`
- `bun run format:write`
- `npm run dev:node`
- `npm run build`
- `npm run start:node`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`
- `npm run format`
- `npm run format:write`

## Docker

El repositorio incluye un `Dockerfile` multi-stage basado en Bun.

- stage de build: `Bun`
- stage de runtime: `Bun`
- runtime por defecto del contenedor: adapter HTTP nativo de Bun

Ejemplo de build:

```bash
docker build -t hexagonal-backend-template-ts .
```

Ejemplo de ejecución:

```bash
docker run --rm -p 3000:3000 --env-file .env hexagonal-backend-template-ts
```

El contenedor expone el backend en el puerto `3000`.
La portabilidad con Node sigue disponible en el repositorio, pero la imagen por defecto pasa a ser Bun-first.

## Endpoints de ejemplo

```http
GET    /health
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
```

Ejemplo de creación:

```bash
curl --request POST \
  --url http://localhost:3000/api/v1/users \
  --header 'content-type: application/json' \
  --data '{
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  }'
```

## Cómo extender el template

1. Crear el modelo de dominio en `src/domain/<feature>`.
2. Implementar casos de uso en `src/application/<feature>`.
3. Conectar adapters en `src/infrastructure`.
4. Registrar dependencias en `src/app/createContainer.ts`.
5. Agregar o actualizar un `HttpModule` en `src/infrastructure/http` y dejar que ambos adapters de runtime lo consuman.

## Qué reemplazar en un proyecto real

- `InMemoryUserRepository` por un adapter real de Postgres, MySQL, MongoDB, Redis o el storage que uses
- `NoopTransactionManager` por una implementación real si tu persistencia soporta transacciones
- La carpeta `users` por tus bounded contexts reales
- Los endpoints HTTP por REST, gRPC, jobs, colas o el adapter de entrada que necesites

## Decisiones de diseño

- El wiring es manual a propósito: reduce magia y hace obvias las dependencias
- El ejemplo usa un repositorio en memoria para que el template arranque sin infraestructura externa
- El dominio no depende de frameworks
- La estructura está deliberadamente orientada a capas para priorizar lectura arquitectónica en proyectos chicos y medianos
- `health` no cuelga de negocio: está tratado como concern operativo del sistema
- Los adapters HTTP dependen del runtime, pero las definiciones de rutas son compartidas para que Bun y Express expongan el mismo comportamiento
- La estructura está deliberadamente enfocada en backend y en límites de servicio claros
- Los resets, fixtures, mocks y helpers equivalentes exclusivos de testing van en `tests/**` o en el setup de pruebas, no en `src/**`, salvo que sean límites reales de dependencias de runtime
- El código de runtime debe limpiar listeners, timers, intervalos, streams, sockets y recursos similares, y debe evitar caches o stores globales sin cota salvo que ese límite sea intencional

</details>
