import type { Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppContainer } from '../../../src/app/createContainer';
import type { Environment } from '../../../src/infrastructure/config/env';
import type { HttpModule, HttpRequest, HttpResponse } from '../../../src/infrastructure/http/HttpModule';
import { captureHttpResponseBody } from '../../../src/infrastructure/logging/httpLogging';
import { PinoLogger } from '../../../src/infrastructure/logging/PinoLogger';

type HttpHeaders = Record<string, number | string | string[] | undefined>;
type HttpRequestDouble = {
    body?: unknown;
    headers?: HttpHeaders;
    method?: string;
    originalUrl?: string;
    query?: Record<string, unknown>;
    socket?: { remoteAddress?: string; };
    url?: string;
};
type HttpResponseDouble = { getHeaders?: () => HttpHeaders; locals?: Record<string, unknown>; statusCode?: number; };
type EchoResponseBody = {
    body: { name: string; };
    headers: Record<string, string>;
    query: { tag: string; };
    remoteAddress: string;
    url: string;
};
type ExpressNext = (error?: unknown) => void;
type ExpressRouteLayer = {
    route?: { path: string; stack: Array<{ handle: (request: unknown, response: unknown, next: ExpressNext) => void; }>; };
};
type ExpressRouterDouble = { stack: ExpressRouteLayer[]; };
type ExpressAppDouble = { _router: ExpressRouterDouble; };
type ExpressRequestDouble = {
    body?: unknown;
    headers: Record<string, string | string[]>;
    method: string;
    originalUrl: string;
    params: Record<string, string>;
    query: Record<string, unknown>;
    socket: { remoteAddress?: string; };
    url: string;
};
type ExpressResponseDouble = {
    body?: unknown;
    ended: boolean;
    headers: Record<string, string>;
    json(body?: unknown): ExpressResponseDouble;
    send(body?: unknown): ExpressResponseDouble;
    end(): void;
    setHeader(name: string, value: string): void;
    status(code: number): ExpressResponseDouble;
    statusCode?: number;
};
type PinoHttpOptions = Record<string, unknown> & {
    customErrorObject: (
        request: HttpRequestDouble,
        response: HttpResponseDouble,
        error: Error,
        value: Record<string, unknown>
    ) => Record<string, unknown>;
    customSuccessObject: (
        request: HttpRequestDouble,
        response: HttpResponseDouble,
        value: Record<string, unknown>
    ) => Record<string, unknown>;
    serializers: {
        req: (request: HttpRequestDouble) => Record<string, unknown>;
        res: (response: HttpResponseDouble) => Record<string, unknown>;
    };
};

const baseEnvironment: Environment = {
    APP_NAME: 'hexagonal-backend-template-ts',
    APP_VERSION: '1.0.0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
    PORT: 3000
};

function createPinoHttpMock() {
    return vi.fn(() => ((_: unknown, __: unknown, next: () => void): void => next()) as never);
}

function createRequestDouble(values: HttpRequestDouble): HttpRequestDouble {
    return values;
}

function createResponseDouble(statusCode: number, headers?: HttpHeaders): HttpResponseDouble {
    return { getHeaders: (): HttpHeaders => headers ?? {}, locals: {}, statusCode };
}

function getPinoHttpOptions(pinoHttpMock: ReturnType<typeof createPinoHttpMock>): PinoHttpOptions {
    const firstCall: unknown[] | undefined = pinoHttpMock.mock.calls[0];
    if (!firstCall) {
        throw new Error('Expected pino-http to be called');
    }

    return firstCall[0] as PinoHttpOptions;
}

function getExpressRouteLayers(app: Express): ExpressRouteLayer[] {
    const expressApp: ExpressAppDouble = app as unknown as ExpressAppDouble;

    return expressApp._router.stack;
}

function createExpressResponseDouble(): ExpressResponseDouble {
    return {
        ended: false,
        headers: {},
        json(body?: unknown): ExpressResponseDouble {
            this.body = body;
            return this;
        },
        send(body?: unknown): ExpressResponseDouble {
            this.body = body;
            return this;
        },
        end(): void {
            this.ended = true;
        },
        setHeader(name: string, value: string): void {
            this.headers[name] = value;
        },
        status(code: number): ExpressResponseDouble {
            this.statusCode = code;
            return this;
        }
    };
}

describe('createApp', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('enables verbose request and response http payloads when log level is debug', async () => {
        const pinoHttpMock = createPinoHttpMock();

        vi.doMock('pino-http', () => ({ default: pinoHttpMock }));

        const { createApp } = await import('../../../src/app/createApp');
        const app = createApp({
            container: {
                env: { ...baseEnvironment, LOG_LEVEL: 'debug' },
                logger: PinoLogger.create('silent', 'hexagonal-backend-template-ts'),
                modules: {}
            },
            createHttpModules: () => []
        });
        const options: PinoHttpOptions = getPinoHttpOptions(pinoHttpMock);
        const request: HttpRequestDouble = createRequestDouble({
            body: { name: 'Alice' },
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            query: { active: 'true' },
            socket: { remoteAddress: '127.0.0.1' },
            url: '/api/v1/users'
        });
        const response: HttpResponseDouble = createResponseDouble(201, { location: '/api/v1/users/1' });

        captureHttpResponseBody(response, { id: 'user-1', name: 'Alice' });

        expect(app).toBeDefined();
        expect(options.customSuccessObject(request, response, { responseTime: 12 })).toEqual({
            http: {
                request: {
                    body: { name: 'Alice' },
                    headers: { 'content-type': 'application/json' },
                    method: 'POST',
                    query: { active: 'true' },
                    remoteAddress: '127.0.0.1',
                    url: '/api/v1/users'
                },
                response: { body: { id: 'user-1', name: 'Alice' }, headers: { location: '/api/v1/users/1' }, statusCode: 201 },
                responseTimeMs: 12
            },
            responseTime: 12
        });
        expect(options.customErrorObject(request, response, new Error('boom'), { responseTime: 7 })).toEqual({
            http: {
                request: {
                    body: { name: 'Alice' },
                    headers: { 'content-type': 'application/json' },
                    method: 'POST',
                    query: { active: 'true' },
                    remoteAddress: '127.0.0.1',
                    url: '/api/v1/users'
                },
                response: { body: { id: 'user-1', name: 'Alice' }, headers: { location: '/api/v1/users/1' }, statusCode: 201 },
                responseTimeMs: 7
            },
            responseTime: 7
        });
        expect(options.serializers.req(request)).toEqual({
            body: { name: 'Alice' },
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            query: { active: 'true' },
            remoteAddress: '127.0.0.1',
            url: '/api/v1/users'
        });
        expect(options.serializers.res(response)).toEqual({
            body: { id: 'user-1', name: 'Alice' },
            headers: { location: '/api/v1/users/1' },
            statusCode: 201
        });
    });

    it('keeps request and response http payloads compact when log level is info', async () => {
        const pinoHttpMock = createPinoHttpMock();

        vi.doMock('pino-http', () => ({ default: pinoHttpMock }));

        const { createApp } = await import('../../../src/app/createApp');
        createApp({
            container: {
                env: { ...baseEnvironment, LOG_LEVEL: 'info' },
                logger: PinoLogger.create('silent', 'hexagonal-backend-template-ts'),
                modules: {}
            },
            createHttpModules: () => []
        });
        const options: PinoHttpOptions = getPinoHttpOptions(pinoHttpMock);
        const request: HttpRequestDouble = createRequestDouble({
            body: { name: 'Alice' },
            headers: { 'content-type': 'application/json' },
            method: 'POST',
            url: '/api/v1/users'
        });
        const response: HttpResponseDouble = createResponseDouble(201, { location: '/api/v1/users/1' });
        const value: Record<string, unknown> = { responseTime: 12 };

        expect(options.customSuccessObject(request, response, value)).toBe(value);
        expect(options.customErrorObject(request, response, new Error('boom'), value)).toBe(value);
        expect(options.serializers.req(request)).toEqual({ method: 'POST', url: '/api/v1/users' });
        expect(options.serializers.res(response)).toEqual({ statusCode: 201 });
    });

    it('adapts Express requests and responses through generic http modules', async () => {
        const pinoHttpMock = createPinoHttpMock();

        vi.doMock('pino-http', () => ({ default: pinoHttpMock }));

        const { createApp } = await import('../../../src/app/createApp');
        const container: AppContainer<Record<string, never>> = {
            env: { ...baseEnvironment, LOG_LEVEL: 'silent' },
            logger: PinoLogger.create('silent', 'hexagonal-backend-template-ts'),
            modules: {}
        };
        const app: Express = createApp({
            container,
            createHttpModules:
                (): HttpModule[] => [{
                    basePath: '/custom',
                    key: 'custom',
                    routes: [{
                        handler: (httpRequest: HttpRequest): Promise<HttpResponse> =>
                            Promise.resolve({
                                body: {
                                    body: httpRequest.body,
                                    headers: httpRequest.headers,
                                    query: httpRequest.query,
                                    remoteAddress: httpRequest.remoteAddress,
                                    url: httpRequest.url
                                },
                                statusCode: 200
                            }),
                        method: 'POST',
                        path: '/echo'
                    }, {
                        handler: (): Promise<HttpResponse> =>
                            Promise.resolve({ body: 'created', headers: { 'x-custom': '1' }, statusCode: 202 }),
                        method: 'GET',
                        path: '/text'
                    }, { handler: (): Promise<HttpResponse> => Promise.resolve({ statusCode: 204 }), method: 'GET', path: '/empty' }]
                }]
        });

        const echoResponse: request.Response = await request(app).post('/custom/echo?tag=a').send({ name: 'Alice' });
        const echoBody: EchoResponseBody = echoResponse.body as EchoResponseBody;
        const textResponse: request.Response = await request(app).get('/custom/text');
        const emptyResponse: request.Response = await request(app).get('/custom/empty');

        expect(echoResponse.status).toBe(200);
        expect(echoBody.body).toEqual({ name: 'Alice' });
        expect(echoBody.headers['content-type']).toContain('application/json');
        expect(echoBody.query).toEqual({ tag: 'a' });
        expect(echoBody.remoteAddress).toBeTypeOf('string');
        expect(echoBody.url).toBe('/custom/echo?tag=a');

        expect(textResponse.status).toBe(202);
        expect(textResponse.headers['x-custom']).toBe('1');
        expect(textResponse.text).toBe('created');

        expect(emptyResponse.status).toBe(204);
        expect(emptyResponse.text).toBe('');
    });

    it('normalizes array request headers when Express provides them as string arrays', async () => {
        const pinoHttpMock = createPinoHttpMock();

        vi.doMock('pino-http', () => ({ default: pinoHttpMock }));

        const { createApp } = await import('../../../src/app/createApp');
        const app: Express = createApp({
            container: {
                env: { ...baseEnvironment, LOG_LEVEL: 'silent' },
                logger: PinoLogger.create('silent', 'hexagonal-backend-template-ts'),
                modules: {}
            },
            createHttpModules:
                (): HttpModule[] => [{
                    basePath: '/custom',
                    key: 'custom',
                    routes: [{
                        handler: (httpRequest: HttpRequest): Promise<HttpResponse> =>
                            Promise.resolve({ body: { headers: httpRequest.headers, url: httpRequest.url }, statusCode: 200 }),
                        method: 'POST',
                        path: '/headers'
                    }]
                }]
        });
        const routeLayer: ExpressRouteLayer | undefined = getExpressRouteLayers(app).find((layer: ExpressRouteLayer): boolean =>
            layer.route?.path === '/custom/headers'
        );

        if (!routeLayer) {
            throw new Error('Expected Express route layer to exist');
        }

        const requestDouble: ExpressRequestDouble = {
            body: undefined,
            headers: { 'x-tags': ['one', 'two'] },
            method: 'POST',
            originalUrl: '',
            params: {},
            query: {},
            socket: {},
            url: '/custom/headers'
        };
        const responseDouble: ExpressResponseDouble = createExpressResponseDouble();
        const next = vi.fn();

        routeLayer.route?.stack[0]?.handle(requestDouble, responseDouble, next);
        await Promise.resolve();

        expect(next).not.toHaveBeenCalled();
        expect(responseDouble.body).toEqual({ headers: { 'x-tags': 'one, two' }, url: '/custom/headers' });
        expect(responseDouble.statusCode).toBe(200);
    });
});
