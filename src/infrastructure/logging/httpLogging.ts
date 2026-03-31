import type { NextFunction, Request, Response } from 'express';
import type { LevelWithSilent } from 'pino';

type HttpHeaders = Record<string, number | string | string[] | undefined>;
type HttpResponseBodyCarrier = { locals?: Record<string, unknown>; };
type HttpResponseBodyCaptureTarget = HttpResponseBodyCarrier & { json: (body?: unknown) => unknown; send: (body?: unknown) => unknown; };
type SerializableHttpRequest = {
    body?: unknown;
    headers?: HttpHeaders;
    id?: unknown;
    method?: string;
    originalUrl?: string;
    params?: Record<string, string | string[]>;
    query?: Record<string, unknown>;
    socket?: { remoteAddress?: string | undefined; };
    url?: string;
};
type SerializableHttpResponse = HttpResponseBodyCarrier & { getHeaders?: () => HttpHeaders; statusCode?: number; };
type HttpLogObject = Record<string, unknown>;
type HttpLogValue = Record<string, unknown> & { responseTime?: number; };

const DEBUG_HTTP_HEADERS: readonly string[] = ['accept', 'content-length', 'content-type', 'host', 'user-agent', 'x-request-id'];
const HTTP_RESPONSE_BODY_LOCAL_KEY: string = '__httpResponseBody';

export function shouldLogVerboseHttp(level: LevelWithSilent): boolean {
    return level === 'debug' || level === 'trace';
}

export function createVerboseHttpBodyCaptureMiddleware(): (request: Request, response: Response, next: NextFunction) => void {
    return (_request: Request, response: Response, next: NextFunction): void => {
        patchHttpResponseBodyCapture(response);
        next();
    };
}

export function captureHttpResponseBody(response: HttpResponseBodyCarrier, body: unknown): void {
    const normalizedBody: unknown = normalizeHttpBody(body);
    if (!shouldSerializeHttpBody(normalizedBody)) {
        return;
    }

    const locals: Record<string, unknown> = response.locals ?? {};
    if (response.locals === undefined) {
        response.locals = locals;
    }

    if (locals[HTTP_RESPONSE_BODY_LOCAL_KEY] !== undefined) {
        return;
    }

    locals[HTTP_RESPONSE_BODY_LOCAL_KEY] = normalizedBody;
}

export function serializeHttpRequest(request: SerializableHttpRequest, verbose: boolean = false): Record<string, unknown> {
    const serializedRequest: Record<string, unknown> = {};
    if (isHttpLogScalar(request.id)) {
        serializedRequest.id = request.id;
    }
    if (request.method) {
        serializedRequest.method = request.method;
    }
    serializedRequest.url = resolveHttpPath(request);

    if (!verbose) {
        return serializedRequest;
    }

    if (request.params && Object.keys(request.params).length > 0) {
        serializedRequest.params = request.params;
    }

    if (request.query && Object.keys(request.query).length > 0) {
        serializedRequest.query = request.query;
    }

    if (shouldSerializeHttpBody(request.body)) {
        serializedRequest.body = request.body;
    }

    const headers: HttpHeaders = selectHttpHeaders(request.headers);
    if (Object.keys(headers).length > 0) {
        serializedRequest.headers = headers;
    }

    if (request.socket?.remoteAddress) {
        serializedRequest.remoteAddress = request.socket.remoteAddress;
    }

    return serializedRequest;
}

export function serializeHttpResponse(response: SerializableHttpResponse, verbose: boolean = false): Record<string, unknown> {
    const serializedResponse: Record<string, unknown> = response.statusCode === undefined ? {} : { statusCode: response.statusCode };

    if (!verbose) {
        return serializedResponse;
    }

    const headers: HttpHeaders = response.getHeaders?.() ?? {};
    if (Object.keys(headers).length > 0) {
        serializedResponse.headers = headers;
    }

    const body: unknown = response.locals?.[HTTP_RESPONSE_BODY_LOCAL_KEY];
    if (shouldSerializeHttpBody(body)) {
        serializedResponse.body = body;
    }

    return serializedResponse;
}

export function resolveHttpLogLevel(_request: SerializableHttpRequest, response: SerializableHttpResponse, error?: Error): LevelWithSilent {
    const statusCode: number = resolveHttpStatusCode(response);

    if (error || statusCode >= 500) {
        return 'error';
    }

    if (statusCode >= 400) {
        return 'warn';
    }

    return 'info';
}

export function formatHttpSuccessMessage(
    request: SerializableHttpRequest,
    response: SerializableHttpResponse,
    responseTime: number
): string {
    return `${resolveHttpMethod(request)} ${resolveHttpPath(request)} -> ${resolveHttpStatusLabel(response)} (${
        Math.round(responseTime)
    } ms)`;
}

export function formatHttpErrorMessage(request: SerializableHttpRequest, response: SerializableHttpResponse, error: Error): string {
    return `${resolveHttpMethod(request)} ${resolveHttpPath(request)} -> ${
        resolveHttpStatusLabel(response)
    } ${error.name}: ${error.message}`;
}

export function buildHttpSuccessObject(
    request: SerializableHttpRequest,
    response: SerializableHttpResponse,
    value: HttpLogValue,
    verbose: boolean = false
): HttpLogObject {
    if (!verbose) {
        return value;
    }

    return { ...value, http: buildVerboseHttpDetails(request, response, value.responseTime) };
}

export function buildHttpErrorObject(
    request: SerializableHttpRequest,
    response: SerializableHttpResponse,
    _error: Error,
    value: HttpLogValue,
    verbose: boolean = false
): HttpLogObject {
    if (!verbose) {
        return value;
    }

    return { ...value, http: buildVerboseHttpDetails(request, response, value.responseTime) };
}

function resolveHttpMethod(request: Pick<SerializableHttpRequest, 'method'>): string {
    return request.method || 'HTTP';
}

function resolveHttpStatusCode(response: SerializableHttpResponse): number {
    return response.statusCode ?? 0;
}

function resolveHttpStatusLabel(response: SerializableHttpResponse): string {
    return response.statusCode === undefined ? '-' : String(response.statusCode);
}

function resolveHttpPath(request: Pick<SerializableHttpRequest, 'originalUrl' | 'url'>): string {
    return request.originalUrl || request.url || '/';
}

function buildVerboseHttpDetails(
    request: SerializableHttpRequest,
    response: SerializableHttpResponse,
    responseTime?: unknown
): Record<string, unknown> {
    const details: Record<string, unknown> = {
        request: serializeHttpRequest(request, true),
        response: serializeHttpResponse(response, true)
    };

    if (typeof responseTime === 'number') {
        details.responseTimeMs = Math.round(responseTime);
    }

    return details;
}

function patchHttpResponseBodyCapture(response: HttpResponseBodyCaptureTarget): void {
    const originalJson: (body?: unknown) => unknown = response.json.bind(response);
    const originalSend: (body?: unknown) => unknown = response.send.bind(response);

    response.json = (body?: unknown): unknown => {
        captureHttpResponseBody(response, body);
        return originalJson(body);
    };
    response.send = (body?: unknown): unknown => {
        captureHttpResponseBody(response, body);
        return originalSend(body);
    };
}

function normalizeHttpBody(body: unknown): unknown {
    if (Buffer.isBuffer(body)) {
        return body.length > 0 ? body.toString('utf8') : undefined;
    }

    return body;
}

function shouldSerializeHttpBody(body: unknown): boolean {
    if (body === undefined || body === null) {
        return false;
    }

    if (typeof body === 'string') {
        return body.length > 0;
    }

    if (Array.isArray(body)) {
        return body.length > 0;
    }

    if (typeof body === 'object') {
        return Object.keys(body).length > 0;
    }

    return true;
}

function selectHttpHeaders(headers?: HttpHeaders): HttpHeaders {
    if (!headers) {
        return {};
    }

    const selectedHeaders: HttpHeaders = {};

    for (const headerName of DEBUG_HTTP_HEADERS) {
        const value: number | string | string[] | undefined = headers[headerName];
        if (value !== undefined) {
            selectedHeaders[headerName] = value;
        }
    }

    return selectedHeaders;
}

function isHttpLogScalar(value: unknown): value is boolean | number | string {
    return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';
}
