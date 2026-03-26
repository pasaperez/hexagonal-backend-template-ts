import express, { type Express, type Request, type Response } from 'express';
import pinoHttp from 'pino-http';
import { asyncHandler } from '../infrastructure/http/asyncHandler';
import { createErrorHandler } from '../infrastructure/http/errorHandler';
import { buildEndpointCatalog, type HttpMethod, type HttpModule, type HttpRequest, type HttpResponse, joinHttpPaths } from '../infrastructure/http/HttpModule';
import { notFoundHandler } from '../infrastructure/http/notFoundHandler';
import { buildHttpErrorObject, buildHttpSuccessObject, createVerboseHttpBodyCaptureMiddleware, formatHttpErrorMessage, formatHttpSuccessMessage, resolveHttpLogLevel, serializeHttpRequest, serializeHttpResponse, shouldLogVerboseHttp } from '../infrastructure/logging/httpLogging';
import type { AppContainer } from './createContainer';

export interface CreateAppOptions<TModules> {
    container: AppContainer<TModules>;
    createHttpModules: (modules: TModules) => HttpModule[];
}

export function createApp<TModules>({ container, createHttpModules }: CreateAppOptions<TModules>): Express {
    const app: Express = express();
    const httpModules: HttpModule[] = createHttpModules(container.modules);
    const httpLogger: typeof container.logger = container.logger.child({ component: 'http' });
    const verboseHttpLogs: boolean = shouldLogVerboseHttp(container.env.LOG_LEVEL);

    app.disable('x-powered-by');
    app.use(
        pinoHttp<Request, Response>({
            customErrorObject: (request: Request, response: Response, error: Error, value: Record<string, unknown>) =>
                buildHttpErrorObject(request, response, error, value, verboseHttpLogs),
            customErrorMessage: formatHttpErrorMessage,
            customLogLevel: resolveHttpLogLevel,
            customSuccessObject: (request: Request, response: Response, value: Record<string, unknown>) =>
                buildHttpSuccessObject(request, response, value, verboseHttpLogs),
            customSuccessMessage: formatHttpSuccessMessage,
            logger: httpLogger.toPino(),
            quietReqLogger: true,
            quietResLogger: true,
            serializers: {
                req: (request: Request): Record<string, unknown> => serializeHttpRequest(request, verboseHttpLogs),
                res: (response: Response): Record<string, unknown> => serializeHttpResponse(response, verboseHttpLogs)
            }
        })
    );
    if (verboseHttpLogs) {
        app.use(createVerboseHttpBodyCaptureMiddleware());
    }
    app.use(express.json());

    app.get('/', (_request: Request, response: Response): void => {
        sendExpressHttpResponse(response, {
            body: {
                endpoints: buildEndpointCatalog(httpModules),
                environment: container.env.NODE_ENV,
                name: container.env.APP_NAME,
                version: container.env.APP_VERSION
            },
            statusCode: 200
        });
    });

    for (const httpModule of httpModules) {
        for (const route of httpModule.routes) {
            registerExpressRoute(app, httpModule, route);
        }
    }

    app.use(notFoundHandler);
    app.use(createErrorHandler(container.logger));

    return app;
}

function registerExpressRoute(app: Express, httpModule: HttpModule, route: HttpModule['routes'][number]): void {
    const method: Lowercase<HttpMethod> = route.method.toLowerCase() as Lowercase<HttpMethod>;
    const fullPath: string = joinHttpPaths(httpModule.basePath, route.path);

    app[method](
        fullPath,
        asyncHandler(async (request: Request, response: Response): Promise<void> => {
            const result: HttpResponse = await route.handler(createExpressHttpRequest(request));

            sendExpressHttpResponse(response, result);
        })
    );
}

function createExpressHttpRequest(request: Request): HttpRequest {
    const httpRequest: HttpRequest = {
        body: request.body,
        headers: normalizeExpressHeaders(request.headers),
        method: request.method,
        params: request.params as Record<string, string>,
        query: request.query as Record<string, unknown>,
        url: request.originalUrl || request.url
    };

    if (request.socket.remoteAddress) {
        httpRequest.remoteAddress = request.socket.remoteAddress;
    }

    return httpRequest;
}

function normalizeExpressHeaders(headers: Request['headers']): Record<string, string> {
    const normalizedHeaders: Record<string, string> = {};

    for (const [headerName, headerValue] of Object.entries(headers)) {
        if (typeof headerValue === 'string') {
            normalizedHeaders[headerName] = headerValue;
            continue;
        }

        if (Array.isArray(headerValue)) {
            normalizedHeaders[headerName] = headerValue.join(', ');
        }
    }

    return normalizedHeaders;
}

function sendExpressHttpResponse(response: Response, httpResponse: HttpResponse): void {
    if (httpResponse.headers) {
        for (const [headerName, headerValue] of Object.entries(httpResponse.headers)) {
            response.setHeader(headerName, headerValue);
        }
    }

    response.status(httpResponse.statusCode);
    if (httpResponse.body === undefined) {
        response.end();
        return;
    }

    if (typeof httpResponse.body === 'string' || Buffer.isBuffer(httpResponse.body)) {
        response.send(httpResponse.body);
        return;
    }

    response.json(httpResponse.body);
}
