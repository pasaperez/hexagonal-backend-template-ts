import { buildEndpointCatalog, type HttpModule, type HttpRequest, type HttpResponse, normalizeHttpPath, resolveHttpRoute } from '../infrastructure/http/HttpModule';
import { buildErrorHttpResponse, buildInvalidJsonError, buildNotFoundHttpResponse } from '../infrastructure/http/httpResponses';
import { buildHttpErrorObject, buildHttpSuccessObject, captureHttpResponseBody, formatHttpErrorMessage, formatHttpSuccessMessage, resolveHttpLogLevel, shouldLogVerboseHttp } from '../infrastructure/logging/httpLogging';
import type { PinoLogger } from '../infrastructure/logging/PinoLogger';
import type { CreateAppOptions } from './createApp';

export interface RunningHttpServer {
    runtime: 'bun' | 'node';
    stop(): Promise<void>;
}

interface BunRequestIPResult {
    address: string;
}

interface BunServeServer {
    requestIP?(request: Request): BunRequestIPResult | null;
    stop(closeActiveConnections?: boolean): Promise<void> | void;
}

interface BunServeOptions {
    fetch: (request: Request, server: BunServeServer) => Promise<Response> | Response;
    hostname: string;
    port: number;
}

interface BunRuntime {
    serve(options: BunServeOptions): BunServeServer;
}

type SerializableHttpResponse = { getHeaders: () => Record<string, string>; locals: Record<string, unknown>; statusCode: number; };

export function getBunRuntime(): BunRuntime | undefined {
    return (globalThis as { Bun?: BunRuntime; }).Bun;
}

export function createBunFetchHandler<TModules>(
    { container, createHttpModules }: CreateAppOptions<TModules>
): (request: Request, server?: BunServeServer) => Promise<Response> {
    const httpModules: HttpModule[] = createHttpModules(container.modules);
    const httpLogger: PinoLogger = container.logger.child({ component: 'http' });
    const verboseHttpLogs: boolean = shouldLogVerboseHttp(container.env.LOG_LEVEL);

    return async (request: Request, server?: BunServeServer): Promise<Response> => {
        const startedAt: number = Date.now();
        const url: URL = new URL(request.url);
        const resolvedRoute: ReturnType<typeof resolveHttpRoute> = resolveHttpRoute(httpModules, request.method, url.pathname);
        const remoteAddress: string | undefined = server?.requestIP?.(request)?.address;
        let httpRequest: HttpRequest = createBunHttpRequest(request, url, resolvedRoute?.params ?? {}, undefined, remoteAddress);

        try {
            const requestBody: unknown = await parseBunRequestBody(request);
            httpRequest = createBunHttpRequest(request, url, resolvedRoute?.params ?? {}, requestBody, remoteAddress);
            const httpResponse: HttpResponse = await resolveBunHttpResponse(httpModules, resolvedRoute, httpRequest, { container });

            logBunHttpResponse(httpLogger, httpRequest, httpResponse, Date.now() - startedAt, verboseHttpLogs);
            return createWebResponse(httpResponse);
        } catch (error: unknown) {
            const httpResponse: HttpResponse = buildErrorHttpResponse(error, container.logger);
            const normalizedError: Error = error instanceof Error ? error : new Error(String(error));

            logBunHttpResponse(httpLogger, httpRequest, httpResponse, Date.now() - startedAt, verboseHttpLogs, normalizedError);
            return createWebResponse(httpResponse);
        }
    };
}

export function startBunServer<TModules>(options: CreateAppOptions<TModules>): Promise<RunningHttpServer> {
    const bunRuntime: BunRuntime | undefined = getBunRuntime();
    if (!bunRuntime) {
        throw new Error('Bun runtime is not available');
    }

    const server: BunServeServer = bunRuntime.serve({
        fetch: createBunFetchHandler(options),
        hostname: options.container.env.HOST,
        port: options.container.env.PORT
    });

    options.container.logger.info('HTTP server listening', { host: options.container.env.HOST, port: options.container.env.PORT });

    return Promise.resolve({
        runtime: 'bun',
        stop: async (): Promise<void> => {
            await server.stop(true);
        }
    });
}

async function resolveBunHttpResponse<TModules>(
    httpModules: HttpModule[],
    resolvedRoute: ReturnType<typeof resolveHttpRoute>,
    httpRequest: HttpRequest,
    options: Pick<CreateAppOptions<TModules>, 'container'>
): Promise<HttpResponse> {
    if (normalizeHttpPath(new URL(`http://localhost${httpRequest.url}`).pathname) === '/') {
        return {
            body: {
                endpoints: buildEndpointCatalog(httpModules),
                environment: options.container.env.NODE_ENV,
                name: options.container.env.APP_NAME,
                version: options.container.env.APP_VERSION
            },
            statusCode: 200
        };
    }

    if (!resolvedRoute) {
        return buildNotFoundHttpResponse();
    }

    return resolvedRoute.route.handler(httpRequest);
}

function createBunHttpRequest(
    request: Request,
    url: URL,
    params: Record<string, string>,
    body: unknown,
    remoteAddress?: string
): HttpRequest {
    const httpRequest: HttpRequest = {
        body,
        headers: normalizeHeaders(request.headers),
        method: request.method,
        params,
        query: buildQueryObject(url.searchParams),
        url: `${normalizeHttpPath(url.pathname)}${url.search}`
    };

    if (remoteAddress) {
        httpRequest.remoteAddress = remoteAddress;
    }

    return httpRequest;
}

async function parseBunRequestBody(request: Request): Promise<unknown> {
    if (!shouldReadHttpBody(request)) {
        return undefined;
    }

    const rawBody: string = await request.text();
    if (rawBody.length === 0) {
        return undefined;
    }

    const contentType: string = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(rawBody) as unknown;
        } catch {
            throw buildInvalidJsonError();
        }
    }

    return rawBody;
}

function shouldReadHttpBody(request: Request): boolean {
    return request.method !== 'GET' && request.method !== 'HEAD';
}

function normalizeHeaders(headers: Headers): Record<string, string> {
    const normalizedHeaders: Record<string, string> = {};

    for (const [headerName, headerValue] of headers.entries()) {
        normalizedHeaders[headerName] = headerValue;
    }

    return normalizedHeaders;
}

function buildQueryObject(searchParams: URLSearchParams): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    for (const [key, value] of searchParams.entries()) {
        const currentValue: unknown = query[key];
        if (currentValue === undefined) {
            query[key] = value;
            continue;
        }

        if (Array.isArray(currentValue)) {
            currentValue.push(value);
            continue;
        }

        query[key] = [currentValue, value];
    }

    return query;
}

function createWebResponse(httpResponse: HttpResponse): Response {
    const headers: Headers = new Headers(httpResponse.headers);
    if (httpResponse.body === undefined) {
        return new Response(null, { headers, status: httpResponse.statusCode });
    }

    if (
        typeof httpResponse.body === 'string' || httpResponse.body instanceof Blob || httpResponse.body instanceof Uint8Array
        || Buffer.isBuffer(httpResponse.body)
    ) {
        return new Response(httpResponse.body as never, { headers, status: httpResponse.statusCode });
    }

    return Response.json(httpResponse.body, { headers, status: httpResponse.statusCode });
}

function logBunHttpResponse(
    logger: PinoLogger,
    request: HttpRequest,
    httpResponse: HttpResponse,
    responseTime: number,
    verbose: boolean,
    error?: Error
): void {
    const responseForLogging: SerializableHttpResponse = {
        getHeaders: (): Record<string, string> => httpResponse.headers ?? {},
        locals: {},
        statusCode: httpResponse.statusCode
    };

    captureHttpResponseBody(responseForLogging, httpResponse.body);

    const logValue: Record<string, unknown> = { responseTime, statusCode: httpResponse.statusCode };
    const level: ReturnType<typeof resolveHttpLogLevel> = resolveHttpLogLevel(request, responseForLogging, error);
    const message: string = error
        ? formatHttpErrorMessage(request, responseForLogging, error)
        : formatHttpSuccessMessage(request, responseForLogging, responseTime);
    const meta: Record<string, unknown> = error
        ? buildHttpErrorObject(request, responseForLogging, error, logValue, verbose)
        : buildHttpSuccessObject(request, responseForLogging, logValue, verbose);

    switch (level) {
        case 'error':
            logger.error(message, meta);
            return;
        case 'warn':
            logger.warn(message, meta);
            return;
        default:
            logger.info(message, meta);
    }
}
