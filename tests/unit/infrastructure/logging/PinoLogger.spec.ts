import type { Logger as PinoInstance } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { PinoLogger } from '../../../../src/infrastructure/logging/PinoLogger';

type Spy = ReturnType<typeof vi.fn>;

interface PinoDouble {
    instance: PinoInstance;
    spies: { child: Spy; debug: Spy; error: Spy; info: Spy; warn: Spy; };
}

function createPinoDouble(childInstance?: PinoInstance): PinoDouble {
    const child: Spy = vi.fn((): PinoInstance => childInstance ?? createPinoDouble().instance);
    const debug: Spy = vi.fn();
    const error: Spy = vi.fn();
    const info: Spy = vi.fn();
    const warn: Spy = vi.fn();

    return { instance: { child, debug, error, info, warn } as unknown as PinoInstance, spies: { child, debug, error, info, warn } };
}

describe('PinoLogger', () => {
    it('creates a real pino logger instance', () => {
        const logger: PinoLogger = PinoLogger.create('silent', 'hexagonal-backend-template-ts');

        expect(logger.toPino()).toBeDefined();
    });

    it('delegates log calls and child creation to the wrapped pino instance', () => {
        const childDouble: PinoDouble = createPinoDouble();
        const baseDouble: PinoDouble = createPinoDouble(childDouble.instance);
        const logger: PinoLogger = new PinoLogger(baseDouble.instance);
        const childLogger: PinoLogger = logger.child({ scope: 'users' });

        logger.debug('debug without meta');
        logger.debug('debug with meta', { traceId: '1' });
        logger.info('info without meta');
        logger.info('info with meta', { traceId: '2' });
        logger.warn('warn without meta');
        logger.warn('warn with meta', { traceId: '3' });
        logger.error('error without meta');
        logger.error('error with meta', { traceId: '4' });
        childLogger.info('child info');

        expect(baseDouble.spies.child).toHaveBeenCalledWith({ scope: 'users' });
        expect(baseDouble.spies.debug).toHaveBeenNthCalledWith(1, {}, 'debug without meta');
        expect(baseDouble.spies.debug).toHaveBeenNthCalledWith(2, { traceId: '1' }, 'debug with meta');
        expect(baseDouble.spies.info).toHaveBeenNthCalledWith(1, {}, 'info without meta');
        expect(baseDouble.spies.info).toHaveBeenNthCalledWith(2, { traceId: '2' }, 'info with meta');
        expect(baseDouble.spies.warn).toHaveBeenNthCalledWith(1, {}, 'warn without meta');
        expect(baseDouble.spies.warn).toHaveBeenNthCalledWith(2, { traceId: '3' }, 'warn with meta');
        expect(baseDouble.spies.error).toHaveBeenNthCalledWith(1, {}, 'error without meta');
        expect(baseDouble.spies.error).toHaveBeenNthCalledWith(2, { traceId: '4' }, 'error with meta');
        expect(childDouble.spies.info).toHaveBeenCalledWith({}, 'child info');
    });
});
