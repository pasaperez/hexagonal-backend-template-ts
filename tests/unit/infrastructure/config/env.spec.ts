import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { loadEnvironment } from '../../../../src/infrastructure/config/env';

describe('loadEnvironment', () => {
    it('fills sensible defaults', () => {
        expect(loadEnvironment({})).toEqual({
            APP_NAME: 'hexagonal-backend-template-ts',
            APP_VERSION: '1.0.0',
            HOST: '0.0.0.0',
            LOG_LEVEL: 'info',
            NODE_ENV: 'development',
            PORT: 3000
        });
    });

    it('parses explicit string values', () => {
        expect(
            loadEnvironment({
                APP_NAME: 'custom-service',
                APP_VERSION: '2.3.4',
                HOST: '127.0.0.1',
                LOG_LEVEL: 'debug',
                NODE_ENV: 'production',
                PORT: '8080'
            })
        ).toEqual({
            APP_NAME: 'custom-service',
            APP_VERSION: '2.3.4',
            HOST: '127.0.0.1',
            LOG_LEVEL: 'debug',
            NODE_ENV: 'production',
            PORT: 8080
        });
    });

    it('rejects invalid environment values', () => {
        expect(() => loadEnvironment({ PORT: '0' })).toThrow(ZodError);
    });
});
