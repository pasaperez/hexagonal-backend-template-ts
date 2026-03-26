import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../../../src/application/shared/ApplicationError';
import type { Logger } from '../../../../src/application/shared/ports/Logger';
import { DomainError } from '../../../../src/domain/shared/DomainError';
import { createErrorHandler } from '../../../../src/infrastructure/http/errorHandler';
import { notFoundHandler } from '../../../../src/infrastructure/http/notFoundHandler';

type Spy = ReturnType<typeof vi.fn>;

interface ResponseDouble {
    json: Spy;
    status: Spy;
}

class SampleDomainError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

function createResponseDouble(): Response {
    const status: Spy = vi.fn();
    const json: Spy = vi.fn();
    const response: ResponseDouble = { json, status };

    status.mockReturnValue(response);
    json.mockReturnValue(response);

    return response as unknown as Response;
}

describe('HTTP infrastructure', () => {
    it('maps zod errors to a 400 response', () => {
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const handler: ReturnType<typeof createErrorHandler> = createErrorHandler(logger);
        const response: Response = createResponseDouble();
        const result: z.SafeParseReturnType<{ name: string; }, { name: string; }> = z.object({ name: z.string() }).safeParse({ name: 10 });

        if (result.success) {
            throw new Error('Expected zod parsing to fail');
        }

        handler(result.error, {} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            error: { code: 'INVALID_REQUEST', details: result.error.flatten(), message: 'Request validation failed' }
        });
        expect(logger.error as Spy).not.toHaveBeenCalled();
    });

    it('maps application errors to their declared status code', () => {
        const handler: ReturnType<typeof createErrorHandler> = createErrorHandler({
            debug: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn()
        });
        const response: Response = createResponseDouble();

        handler(new ValidationError('Invalid body', 'INVALID_BODY'), {} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({ error: { code: 'INVALID_BODY', message: 'Invalid body' } });
    });

    it('maps domain errors to a domain error payload', () => {
        const handler: ReturnType<typeof createErrorHandler> = createErrorHandler({
            debug: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn()
        });
        const response: Response = createResponseDouble();

        handler(new SampleDomainError('Broken invariant'), {} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({ error: { code: 'DOMAIN_ERROR', message: 'Broken invariant' } });
    });

    it('logs unexpected Error instances and returns 500', () => {
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const handler: ReturnType<typeof createErrorHandler> = createErrorHandler(logger);
        const response: Response = createResponseDouble();
        const error: Error = new Error('Unexpected failure');

        handler(error, {} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(logger.error as Spy).toHaveBeenCalledWith('Unexpected error', {
            message: 'Unexpected failure',
            name: 'Error',
            stack: error.stack
        });
        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } });
    });

    it('logs unexpected non-error values and returns 500', () => {
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const handler: ReturnType<typeof createErrorHandler> = createErrorHandler(logger);
        const response: Response = createResponseDouble();

        handler('boom', {} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(logger.error as Spy).toHaveBeenCalledWith('Unexpected non-error thrown', { error: 'boom' });
        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } });
    });

    it('returns the default 404 payload for unknown routes', () => {
        const response: Response = createResponseDouble();

        notFoundHandler({} as never, response, vi.fn());

        const { status, json }: ResponseDouble = response as unknown as ResponseDouble;

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
    });
});
