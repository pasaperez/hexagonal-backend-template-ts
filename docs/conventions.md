# Code conventions, logging and tests

Read this before writing code or tests, and before running the final validation.

## Code conventions

- In `src/**`, keep explicit types and respect the strict typing already configured.
- Prefer compact, readable code over decorative whitespace.
- One import per line. Avoid multiline imports unless they are truly necessary.
- Use 140 characters as the normal width (the shared `dprint.json`). Short signatures, imports, conditions, and small objects can stay on one line.
- Avoid empty lines inside very short methods or functions when they do not add clarity.
- Do not leave an extra blank line after the final block in a file. A normal final newline is fine.
- Add comments only when they provide real context.
- Formatting is handled by `dprint`, not Prettier.
- Prefer repository-level `dprint.json` changes over scattered formatter-ignore comments.
- If formatting must be bypassed for a real edge case, use a narrow `dprint-ignore` only on that specific code.
- Keep test-only resets, fixtures, mocks, and similar helpers out of `src/**`. Put that support in `tests/**` or test setup unless it is a real runtime dependency boundary.
- Avoid memory leaks and process leaks. Clean up listeners, timers, intervals, streams, sockets, workers, and similar resources, and do not introduce unbounded process-global stores or caches unless they are deliberate runtime boundaries.

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

## No dead code

Nothing stays in the repository without a user. This is a hard rule for every change, not a cleanup task for later.

1. **Delete in the same change.** When a change makes something unused it deletes it there: functions, exports, types, files, component props, CSS classes and variables, theme tokens, environment variables, dependencies, scripts and documentation. Removing a feature takes its routes, navigation entry, actions, adapters, tests and docs with it.
2. **No zombies.** No commented-out code, no `TODO`/`FIXME`, no options or flags nothing sets, no parameters nothing passes, no `export` only to import it somewhere "later".
3. **Production code is not written for tests.** A function, option or export that only tests use is dead code: tests exercise what production uses (inject a collaborator or use the public entry point). Exporting an internal function for a unit test is allowed only when production code also uses it inside its own file.
4. **Examples are code too.** The sample `users` feature stays because it is wired, run and tested; a primitive, helper or style that no example uses is removed, not kept "for adopters".
5. **Enforced, not honour-system.** The TypeScript build runs with `noUnusedLocals` and `noUnusedParameters`; `bun run lint` runs `scripts/dead-code.mjs`, which fails on an export nobody imports, an export only tests use, a file nobody imports and a CSS class no component names (a class built as `` `prefix--${x}` `` counts as used). Fix the finding by deleting; never by silencing the check or adding a fake reference. Files the framework loads by convention are listed in the script's `entryFiles`.
6. Reviewers reject a change that leaves any of the above even when tests and lint pass.
