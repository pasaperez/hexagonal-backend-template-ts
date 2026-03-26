import { describe, expect, it } from 'vitest';
import { buildHttpErrorObject, buildHttpSuccessObject, captureHttpResponseBody, createVerboseHttpBodyCaptureMiddleware, formatHttpErrorMessage, formatHttpSuccessMessage, resolveHttpLogLevel, serializeHttpRequest, serializeHttpResponse, shouldLogVerboseHttp } from '../../../../src/infrastructure/logging/httpLogging';

type HttpHeaders = Record<string, number | string | string[] | undefined>;
type HttpRequestDouble = {
    body?: unknown;
    headers?: HttpHeaders;
    method?: string;
    originalUrl?: string;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    socket?: { remoteAddress?: string; };
    url?: string;
};
type HttpResponseDouble = {
    getHeaders?: () => HttpHeaders;
    json?: (body?: unknown) => unknown;
    locals?: Record<string, unknown>;
    send?: (body?: unknown) => unknown;
    statusCode?: number;
};

function createRequestDouble(values: HttpRequestDouble): HttpRequestDouble {
    return values;
}

function createResponseDouble(statusCode: number, headers?: HttpHeaders): HttpResponseDouble {
    return { getHeaders: (): HttpHeaders => headers ?? {}, locals: {}, statusCode };
}

describe('httpLogging', () => {
    it('serializes requests compactly by default and with more detail in debug mode', () => {
        expect(serializeHttpRequest({ id: 'req-1', method: 'POST', originalUrl: '/api/v1/users?active=true', url: '/fallback' })).toEqual({
            id: 'req-1',
            method: 'POST',
            url: '/api/v1/users?active=true'
        });

        expect(serializeHttpRequest({ method: 'GET', url: '/health' })).toEqual({ method: 'GET', url: '/health' });
        expect(serializeHttpRequest({})).toEqual({ url: '/' });
        expect(
            serializeHttpRequest({
                body: { email: 'alice@example.com' },
                headers: { authorization: 'secret', 'content-type': 'application/json', 'user-agent': 'vitest' },
                id: 'req-2',
                method: 'POST',
                params: { id: '123' },
                query: { active: 'true' },
                socket: { remoteAddress: '127.0.0.1' },
                url: '/api/v1/users/123'
            }, true)
        ).toEqual({
            body: { email: 'alice@example.com' },
            headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
            id: 'req-2',
            method: 'POST',
            params: { id: '123' },
            query: { active: 'true' },
            remoteAddress: '127.0.0.1',
            url: '/api/v1/users/123'
        });
        expect(serializeHttpRequest({ body: 0, method: 'POST', url: '/metrics' }, true)).toEqual({
            body: 0,
            method: 'POST',
            url: '/metrics'
        });
        expect(serializeHttpRequest({ body: 'payload', method: 'POST', url: '/string-body' }, true)).toEqual({
            body: 'payload',
            method: 'POST',
            url: '/string-body'
        });
        expect(serializeHttpRequest({ body: '', method: 'POST', url: '/empty-string-body' }, true)).toEqual({
            method: 'POST',
            url: '/empty-string-body'
        });
        expect(serializeHttpRequest({ body: null, method: 'POST', url: '/null-body' }, true)).toEqual({
            method: 'POST',
            url: '/null-body'
        });
        expect(serializeHttpRequest({ body: undefined, method: 'POST', url: '/undefined-body' }, true)).toEqual({
            method: 'POST',
            url: '/undefined-body'
        });
        expect(serializeHttpRequest({ body: ['one'], method: 'POST', url: '/array-body' }, true)).toEqual({
            body: ['one'],
            method: 'POST',
            url: '/array-body'
        });
        expect(serializeHttpRequest({ body: [], method: 'POST', url: '/empty-array-body' }, true)).toEqual({
            method: 'POST',
            url: '/empty-array-body'
        });
    });

    it('serializes responses compactly and with headers in debug mode', () => {
        expect(serializeHttpResponse({ statusCode: 201 })).toEqual({ statusCode: 201 });
        expect(serializeHttpResponse({})).toEqual({});
        expect(serializeHttpResponse({ statusCode: 204 }, true)).toEqual({ statusCode: 204 });
        const response: HttpResponseDouble = createResponseDouble(201, { 'content-type': 'application/json' });

        captureHttpResponseBody(response, { id: 'user-1' });

        expect(serializeHttpResponse(response, true)).toEqual({
            body: { id: 'user-1' },
            headers: { 'content-type': 'application/json' },
            statusCode: 201
        });

        const responseWithoutLocals: HttpResponseDouble = { statusCode: 200 };

        captureHttpResponseBody(responseWithoutLocals, { ok: true });
        captureHttpResponseBody(responseWithoutLocals, { ok: false });

        expect(serializeHttpResponse(responseWithoutLocals, true)).toEqual({ body: { ok: true }, statusCode: 200 });

        const emptyBufferResponse: HttpResponseDouble = { locals: {}, statusCode: 200 };

        captureHttpResponseBody(emptyBufferResponse, Buffer.alloc(0));

        expect(serializeHttpResponse(emptyBufferResponse, true)).toEqual({ statusCode: 200 });
    });

    it('patches response json and send methods to capture verbose response bodies', () => {
        const middleware = createVerboseHttpBodyCaptureMiddleware() as unknown as (
            request: unknown,
            response: HttpResponseDouble & { json: (body?: unknown) => unknown; send: (body?: unknown) => unknown; },
            next: () => void
        ) => void;
        const next = { called: false };
        const response: HttpResponseDouble & { json: (body?: unknown) => unknown; send: (body?: unknown) => unknown; } = {
            json(body?: unknown): unknown {
                return body;
            },
            locals: {},
            send(body?: unknown): unknown {
                return body;
            },
            statusCode: 200
        };

        middleware({}, response, (): void => {
            next.called = true;
        });
        response.json({ ok: true });

        expect(next.called).toBe(true);
        expect(serializeHttpResponse(response, true)).toEqual({ body: { ok: true }, statusCode: 200 });

        const textResponse: HttpResponseDouble & { json: (body?: unknown) => unknown; send: (body?: unknown) => unknown; } = {
            json(body?: unknown): unknown {
                return body;
            },
            locals: {},
            send(body?: unknown): unknown {
                return body;
            },
            statusCode: 200
        };

        middleware({}, textResponse, (): void => undefined);
        textResponse.send(Buffer.from('created'));

        expect(serializeHttpResponse(textResponse, true)).toEqual({ body: 'created', statusCode: 200 });
    });

    it('chooses log levels from the response status and error presence', () => {
        const request: HttpRequestDouble = createRequestDouble({ method: 'GET', url: '/users' });

        expect(resolveHttpLogLevel(request, createResponseDouble(200))).toBe('info');
        expect(resolveHttpLogLevel(request, createResponseDouble(404))).toBe('warn');
        expect(resolveHttpLogLevel(request, createResponseDouble(500))).toBe('error');
        expect(resolveHttpLogLevel(request, createResponseDouble(200), new Error('boom'))).toBe('error');
        expect(resolveHttpLogLevel(request, {})).toBe('info');
    });

    it('detects when verbose http logging should be enabled', () => {
        expect(shouldLogVerboseHttp('trace')).toBe(true);
        expect(shouldLogVerboseHttp('debug')).toBe(true);
        expect(shouldLogVerboseHttp('info')).toBe(false);
    });

    it('formats compact success and error messages', () => {
        const successRequest: HttpRequestDouble = createRequestDouble({ method: 'POST', originalUrl: '/api/v1/users' });
        const errorRequest: HttpRequestDouble = createRequestDouble({ url: '/broken' });

        expect(formatHttpSuccessMessage(successRequest, createResponseDouble(201), 12.6)).toBe('POST /api/v1/users -> 201 (13 ms)');
        expect(formatHttpSuccessMessage(createRequestDouble({}), createResponseDouble(204), 0.4)).toBe('HTTP / -> 204 (0 ms)');
        expect(formatHttpSuccessMessage(createRequestDouble({}), {}, 1.2)).toBe('HTTP / -> - (1 ms)');
        expect(formatHttpErrorMessage(errorRequest, createResponseDouble(500), new Error('boom'))).toBe('HTTP /broken -> 500 Error: boom');
        expect(formatHttpErrorMessage(errorRequest, {}, new Error('boom'))).toBe('HTTP /broken -> - Error: boom');
    });

    it('adds verbose request and response payloads only when debug mode is enabled', () => {
        const request: HttpRequestDouble = createRequestDouble({
            body: { name: 'Alice' },
            headers: { 'content-type': 'application/json', 'x-request-id': 'req-7' },
            method: 'POST',
            query: { active: 'true' },
            socket: { remoteAddress: '127.0.0.1' },
            url: '/api/v1/users'
        });
        const response: HttpResponseDouble = createResponseDouble(201, { location: '/api/v1/users/1' });
        const compactValue: Record<string, unknown> = { responseTime: 12, statusCode: 201 };

        expect(buildHttpSuccessObject(request, response, compactValue, false)).toBe(compactValue);
        expect(buildHttpErrorObject(request, response, new Error('boom'), compactValue, false)).toBe(compactValue);
        expect(buildHttpSuccessObject(request, response, compactValue, true)).toEqual({
            http: {
                request: {
                    body: { name: 'Alice' },
                    headers: { 'content-type': 'application/json', 'x-request-id': 'req-7' },
                    method: 'POST',
                    query: { active: 'true' },
                    remoteAddress: '127.0.0.1',
                    url: '/api/v1/users'
                },
                response: { headers: { location: '/api/v1/users/1' }, statusCode: 201 },
                responseTimeMs: 12
            },
            responseTime: 12,
            statusCode: 201
        });
        expect(buildHttpErrorObject(request, response, new Error('boom'), compactValue, true)).toEqual({
            http: {
                request: {
                    body: { name: 'Alice' },
                    headers: { 'content-type': 'application/json', 'x-request-id': 'req-7' },
                    method: 'POST',
                    query: { active: 'true' },
                    remoteAddress: '127.0.0.1',
                    url: '/api/v1/users'
                },
                response: { headers: { location: '/api/v1/users/1' }, statusCode: 201 },
                responseTimeMs: 12
            },
            responseTime: 12,
            statusCode: 201
        });
    });
});
