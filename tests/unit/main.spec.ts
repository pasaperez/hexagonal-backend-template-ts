import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../../src/infrastructure/config/env';

type Spy = ReturnType<typeof vi.fn>;
type LoggerMethod = ReturnType<typeof vi.fn<(message: string, meta?: Record<string, unknown>) => void>>;

interface LoggerDouble {
    error: LoggerMethod;
    info: LoggerMethod;
}

const testEnvironment: Environment = {
    APP_NAME: 'hexagonal-backend-template-ts',
    APP_VERSION: '1.0.0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    PORT: 3000
};

describe('main bootstrap', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('boots the application and shuts it down gracefully', async () => {
        const logger: LoggerDouble = { error: vi.fn<(message: string, meta?: Record<string, unknown>) => void>(), info: vi.fn() };
        const stop: Spy = vi.fn((): Promise<void> => Promise.resolve());
        const signalHandlers: Map<string, () => void> = new Map<string, () => void>();
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
            ((_code?: number) => {
                return undefined as never;
            }) as typeof process.exit
        );

        vi.spyOn(process, 'on').mockImplementation(
            ((event: string, handler: () => void) => {
                signalHandlers.set(event, handler);

                return process;
            }) as typeof process.on
        );

        vi.doMock('../../src/infrastructure/config/env', () => ({ loadEnvironment: vi.fn(() => testEnvironment) }));
        vi.doMock(
            '../../src/app/createContainer',
            () => ({ createContainer: vi.fn(() => ({ env: testEnvironment, logger, modules: {} })) })
        );
        vi.doMock('../../src/app/startHttpServer', () => ({
            startHttpServer: vi.fn(() => {
                logger.info('HTTP server listening', { host: '127.0.0.1', port: 3000 });

                return Promise.resolve({ runtime: 'node', stop });
            })
        }));

        await import('../../src/main');
        await Promise.resolve();

        expect(logger.info).toHaveBeenCalledWith('HTTP server listening', { host: '127.0.0.1', port: 3000 });

        signalHandlers.get('SIGINT')?.();
        await Promise.resolve();

        expect(stop).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('Shutdown signal received', { signal: 'SIGINT' });
        expect(logger.info).toHaveBeenCalledWith('HTTP server stopped');
        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('exits with code 1 when server shutdown fails', async () => {
        const logger: LoggerDouble = { error: vi.fn<(message: string, meta?: Record<string, unknown>) => void>(), info: vi.fn() };
        const stop: Spy = vi.fn((): Promise<void> => Promise.reject(new Error('close failure')));
        const signalHandlers: Map<string, () => void> = new Map<string, () => void>();
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
            ((_code?: number) => {
                return undefined as never;
            }) as typeof process.exit
        );

        vi.spyOn(process, 'on').mockImplementation(
            ((event: string, handler: () => void) => {
                signalHandlers.set(event, handler);

                return process;
            }) as typeof process.on
        );

        vi.doMock('../../src/infrastructure/config/env', () => ({ loadEnvironment: vi.fn(() => testEnvironment) }));
        vi.doMock(
            '../../src/app/createContainer',
            () => ({ createContainer: vi.fn(() => ({ env: testEnvironment, logger, modules: {} })) })
        );
        vi.doMock('../../src/app/startHttpServer', () => ({
            startHttpServer: vi.fn(() => {
                logger.info('HTTP server listening', { host: '127.0.0.1', port: 3000 });

                return Promise.resolve({ runtime: 'node', stop });
            })
        }));

        await import('../../src/main');
        await Promise.resolve();

        signalHandlers.get('SIGTERM')?.();
        await Promise.resolve();

        expect(logger.error).toHaveBeenCalledWith('Error while closing server', { message: 'close failure' });
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('stringifies non-error shutdown failures', async () => {
        const logger: LoggerDouble = { error: vi.fn<(message: string, meta?: Record<string, unknown>) => void>(), info: vi.fn() };
        const stop: Spy = vi.fn((): Promise<void> =>
            new Promise<void>((_resolve: () => void, reject: (reason: string) => void): void => {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject('close failure');
            })
        );
        const signalHandlers: Map<string, () => void> = new Map<string, () => void>();
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
            ((_code?: number) => {
                return undefined as never;
            }) as typeof process.exit
        );

        vi.spyOn(process, 'on').mockImplementation(
            ((event: string, handler: () => void) => {
                signalHandlers.set(event, handler);

                return process;
            }) as typeof process.on
        );

        vi.doMock('../../src/infrastructure/config/env', () => ({ loadEnvironment: vi.fn(() => testEnvironment) }));
        vi.doMock(
            '../../src/app/createContainer',
            () => ({ createContainer: vi.fn(() => ({ env: testEnvironment, logger, modules: {} })) })
        );
        vi.doMock('../../src/app/startHttpServer', () => ({
            startHttpServer: vi.fn(() => {
                logger.info('HTTP server listening', { host: '127.0.0.1', port: 3000 });

                return Promise.resolve({ runtime: 'node', stop });
            })
        }));

        await import('../../src/main');
        await Promise.resolve();

        signalHandlers.get('SIGTERM')?.();
        await Promise.resolve();

        expect(logger.error).toHaveBeenCalledWith('Error while closing server', { message: 'close failure' });
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('reports bootstrap failures caused by Error instances', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const bootstrapError: Error = new Error('failed to load env');
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
            ((_code?: number) => {
                return undefined as never;
            }) as typeof process.exit
        );

        vi.doMock('../../src/infrastructure/config/env', () => ({
            loadEnvironment: vi.fn(() => {
                throw bootstrapError;
            })
        }));
        vi.doMock('../../src/app/createContainer', () => ({ createContainer: vi.fn() }));
        vi.doMock('../../src/app/startHttpServer', () => ({ startHttpServer: vi.fn() }));

        await import('../../src/main');
        await Promise.resolve();

        expect(consoleError).toHaveBeenCalledWith('Failed to bootstrap application', {
            message: 'failed to load env',
            name: 'Error',
            stack: bootstrapError.stack
        });
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('reports bootstrap failures caused by non-error values', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
            ((_code?: number) => {
                return undefined as never;
            }) as typeof process.exit
        );

        vi.doMock('../../src/infrastructure/config/env', () => ({
            loadEnvironment: vi.fn(() => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw 'boom';
            })
        }));
        vi.doMock('../../src/app/createContainer', () => ({ createContainer: vi.fn() }));
        vi.doMock('../../src/app/startHttpServer', () => ({ startHttpServer: vi.fn() }));

        await import('../../src/main');
        await Promise.resolve();

        expect(consoleError).toHaveBeenCalledWith('Failed to bootstrap application', { error: 'boom' });
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
