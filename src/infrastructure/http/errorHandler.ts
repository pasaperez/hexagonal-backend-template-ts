import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import type { Logger } from '../../application/shared/ports/Logger';
import { buildErrorHttpResponse } from './httpResponses';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
    return (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
        const errorResponse: ReturnType<typeof buildErrorHttpResponse> = buildErrorHttpResponse(error, logger);

        response.status(errorResponse.statusCode).json(errorResponse.body);
    };
}
