import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ApplicationModules, createApplicationModules } from '../../../src/app/composition/createApplicationModules';
import { createBunFetchHandler, getBunRuntime, startBunServer } from '../../../src/app/createBunServer';
import { type AppContainer, createContainer } from '../../../src/app/createContainer';
import type { UserResponse } from '../../../src/application/users/UserResponse';
import type { Environment } from '../../../src/infrastructure/config/env';
import { type HttpModule, type HttpRequest, type HttpResponse } from '../../../src/infrastructure/http/HttpModule';
import { createHttpModules } from '../../../src/infrastructure/http/modules';
import { PinoLogger } from '../../../src/infrastructure/logging/PinoLogger';

const testEnvironment: Environment = {
    APP_NAME: 'hexagonal-backend-template-ts',
    APP_VERSION: '1.0.0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'debug',
    NODE_ENV: 'test',
    PORT: 3000
};

function createApplicationContainer(): AppContainer<ApplicationModules> {
    return createContainer({ createModules: createApplicationModules, env: testEnvironment });
}

function createCustomHttpModules(): HttpModule[] {
    return [{
        basePath: '/custom',
        key: 'custom',
        routes: [
            {
                handler: (request: HttpRequest): Promise<HttpResponse> => Promise.resolve({ body: request.query, statusCode: 200 }),
                method: 'GET',
                path: '/query'
            },
            {
                handler: (request: HttpRequest): Promise<HttpResponse> =>
                    Promise.resolve({
                        body: typeof request.body === 'string' ? request.body : String(request.body),
                        headers: { 'x-custom': '1' },
                        statusCode: 202
                    }),
                method: 'POST',
                path: '/plain'
            },
            {
                handler: (): Promise<HttpResponse> => Promise.resolve({ body: new Uint8Array([111, 107]), statusCode: 200 }),
                method: 'GET',
                path: '/binary'
            },
            { handler: (): Promise<HttpResponse> => Promise.resolve({ statusCode: 204 }), method: 'POST', path: '/empty' },
            { handler: (): Promise<HttpResponse> => Promise.reject(new Error('boom')), method: 'GET', path: '/error' },
            {
                handler: (): Promise<HttpResponse> =>
                    new Promise<HttpResponse>((_resolve: (value: HttpResponse) => void, reject: (reason: string) => void): void => {
                        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                        reject('boom');
                    }),
                method: 'GET',
                path: '/non-error'
            }
        ]
    }];
}

describe('createBunServer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete (globalThis as { Bun?: unknown; }).Bun;
    });

    it('exposes the root endpoint and user routes through the Bun fetch handler', async () => {
        const container: AppContainer<ApplicationModules> = createApplicationContainer();
        const handler = createBunFetchHandler({ container, createHttpModules });
        const rootResponse = await handler(new Request('http://localhost/'));
        const rootBody = await rootResponse.json() as Record<string, unknown>;

        expect(rootResponse.status).toBe(200);
        expect(rootBody).toEqual({
            endpoints: { health: '/health', users: '/api/v1/users' },
            environment: 'test',
            name: 'hexagonal-backend-template-ts',
            version: '1.0.0'
        });

        const createResponse = await handler(
            new Request('http://localhost/api/v1/users', {
                body: JSON.stringify({ email: 'alice@example.com', name: 'Alice' }),
                headers: { 'content-type': 'application/json' },
                method: 'POST'
            }),
            { requestIP: (): { address: string; } => ({ address: '127.0.0.1' }), stop: (): void => undefined }
        );
        const createdUser = await createResponse.json() as UserResponse;

        expect(createResponse.status).toBe(201);
        expect(createdUser.email).toBe('alice@example.com');

        const listResponse = await handler(new Request('http://localhost/api/v1/users'));
        const listBody = await listResponse.json() as { items: UserResponse[]; };

        expect(listResponse.status).toBe(200);
        expect(listBody.items).toHaveLength(1);

        const missingResponse = await handler(new Request('http://localhost/missing-route'));
        const missingBody = await missingResponse.json() as { error: { code: string; message: string; }; };

        expect(missingResponse.status).toBe(404);
        expect(missingBody.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('handles query params, plain text bodies, binary responses and empty responses', async () => {
        const container: AppContainer<Record<string, never>> = {
            env: testEnvironment,
            logger: PinoLogger.create('silent', testEnvironment.APP_NAME),
            modules: {}
        };
        const handler = createBunFetchHandler({ container, createHttpModules: createCustomHttpModules });

        const queryResponse = await handler(new Request('http://localhost/custom/query?tag=a&tag=b&tag=c'));
        const queryBody = await queryResponse.json() as Record<string, unknown>;

        expect(queryBody).toEqual({ tag: ['a', 'b', 'c'] });

        const plainResponse = await handler(
            new Request('http://localhost/custom/plain', { body: 'hello', headers: { 'content-type': 'text/plain' }, method: 'POST' })
        );
        const plainWithoutContentTypeResponse = await handler(
            new Request('http://localhost/custom/plain', { body: new Uint8Array([111, 107]), method: 'POST' })
        );

        expect(plainResponse.status).toBe(202);
        expect(plainResponse.headers.get('x-custom')).toBe('1');
        expect(await plainResponse.text()).toBe('hello');
        expect(await plainWithoutContentTypeResponse.text()).toBe('ok');

        const binaryResponse = await handler(new Request('http://localhost/custom/binary'));

        expect(await binaryResponse.text()).toBe('ok');

        const emptyResponse = await handler(new Request('http://localhost/custom/empty', { method: 'POST' }));

        expect(emptyResponse.status).toBe(204);
        expect(await emptyResponse.text()).toBe('');
    });

    it('maps invalid json payloads and unexpected route errors', async () => {
        const container: AppContainer<Record<string, never>> = {
            env: testEnvironment,
            logger: PinoLogger.create('silent', testEnvironment.APP_NAME),
            modules: {}
        };
        const handler = createBunFetchHandler({ container, createHttpModules: createCustomHttpModules });
        const invalidJsonResponse = await handler(
            new Request('http://localhost/custom/plain', {
                body: '{broken',
                headers: { 'content-type': 'application/json' },
                method: 'POST'
            })
        );
        const invalidJsonBody = await invalidJsonResponse.json() as { error: { code: string; message: string; }; };

        expect(invalidJsonResponse.status).toBe(400);
        expect(invalidJsonBody.error).toEqual({ code: 'INVALID_JSON', message: 'Request body is not valid JSON' });

        const errorResponse = await handler(new Request('http://localhost/custom/error'));
        const errorBody = await errorResponse.json() as { error: { code: string; message: string; }; };
        const nonErrorResponse = await handler(new Request('http://localhost/custom/non-error'));
        const nonErrorBody = await nonErrorResponse.json() as { error: { code: string; message: string; }; };

        expect(errorResponse.status).toBe(500);
        expect(errorBody.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Unexpected error' });
        expect(nonErrorResponse.status).toBe(500);
        expect(nonErrorBody.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Unexpected error' });
    });

    it('exposes the Bun runtime and starts/stops the Bun server', async () => {
        const stop = vi.fn();
        const serve = vi.fn(() => ({ stop }));
        (globalThis as { Bun?: unknown; }).Bun = { serve };

        const container: AppContainer<Record<string, never>> = {
            env: testEnvironment,
            logger: PinoLogger.create('silent', testEnvironment.APP_NAME),
            modules: {}
        };
        const server = await startBunServer({ container, createHttpModules: createCustomHttpModules });

        expect(getBunRuntime()).toEqual({ serve });
        expect(serve).toHaveBeenCalledWith(expect.objectContaining({ hostname: '127.0.0.1', port: 3000 }));

        await server.stop();

        expect(server.runtime).toBe('bun');
        expect(stop).toHaveBeenCalledWith(true);
    });

    it('fails to start the Bun server when the runtime is unavailable', () => {
        const container: AppContainer<Record<string, never>> = {
            env: testEnvironment,
            logger: PinoLogger.create('silent', testEnvironment.APP_NAME),
            modules: {}
        };

        expect(getBunRuntime()).toBeUndefined();
        expect(() => startBunServer({ container, createHttpModules: createCustomHttpModules })).toThrow('Bun runtime is not available');
    });
});
