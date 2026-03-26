import { describe, expect, it } from 'vitest';
import { ApplicationError, ConflictError, NotFoundError, ValidationError } from '../../../../src/application/shared/ApplicationError';

describe('Application errors', () => {
    it('stores the base metadata in ApplicationError', () => {
        const error: ApplicationError = new ApplicationError('Teapot', 'TEAPOT', 418);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ApplicationError');
        expect(error.message).toBe('Teapot');
        expect(error.code).toBe('TEAPOT');
        expect(error.statusCode).toBe(418);
    });

    it('provides consistent defaults and custom codes for specialized errors', () => {
        const validation: ValidationError = new ValidationError('Invalid input');
        const validationCustom: ValidationError = new ValidationError('Invalid input', 'BAD_INPUT');
        const notFound: NotFoundError = new NotFoundError('Missing entity');
        const conflict: ConflictError = new ConflictError('Duplicated entity', 'USER_EXISTS');

        expect(validation).toMatchObject({ code: 'VALIDATION_ERROR', name: 'ValidationError', statusCode: 400 });
        expect(validationCustom.code).toBe('BAD_INPUT');
        expect(notFound).toMatchObject({ code: 'NOT_FOUND', name: 'NotFoundError', statusCode: 404 });
        expect(conflict).toMatchObject({ code: 'USER_EXISTS', name: 'ConflictError', statusCode: 409 });
    });
});
