import { ZodError } from 'zod';
import { ApplicationError, ValidationError } from '../../application/shared/ApplicationError';
import type { Logger } from '../../application/shared/ports/Logger';
import { DomainError } from '../../domain/shared/DomainError';
import type { HttpResponse } from './HttpModule';

export function buildInvalidJsonError(): ValidationError {
    return new ValidationError('Request body is not valid JSON', 'INVALID_JSON');
}

export function buildNotFoundHttpResponse(): HttpResponse {
    return { body: { error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } }, statusCode: 404 };
}

export function buildErrorHttpResponse(error: unknown, logger: Logger): HttpResponse {
    if (error instanceof ZodError) {
        return {
            body: { error: { code: 'INVALID_REQUEST', details: error.flatten(), message: 'Request validation failed' } },
            statusCode: 400
        };
    }

    if (error instanceof ApplicationError) {
        return { body: { error: { code: error.code, message: error.message } }, statusCode: error.statusCode };
    }

    if (error instanceof DomainError) {
        return { body: { error: { code: 'DOMAIN_ERROR', message: error.message } }, statusCode: 400 };
    }

    if (error instanceof Error) {
        logger.error('Unexpected error', { message: error.message, name: error.name, stack: error.stack });
    } else {
        logger.error('Unexpected non-error thrown', { error: String(error) });
    }

    return { body: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }, statusCode: 500 };
}
