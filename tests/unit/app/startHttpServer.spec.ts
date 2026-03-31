import type { Express } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as StartHttpServerModuleType from '../../../src/app/startHttpServer';
import type { AppContainer } from '../../../src/app/createContainer';
import type { Environment } from '../../../src/infrastructure/config/env';
import type { HttpModule } from '../../../src/infrastructure/http/HttpModule';
import { PinoLogger } from '../../../src/infrastructure/logging/PinoLogger';

type Spy = ReturnType<typeof vi.fn>;
type StartHttpServerModule = typeof StartHttpServerModuleType;

const logger: PinoLogger = PinoLogger.create('silent', 'hexagonal-backend-template-ts');
const createHttpModules = (): HttpModule[] => [];
const env: Environment = {
    APP_NAME: 'hexagonal-backend-template-ts',
    APP_VERSION: '1.0.0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    PORT: 3000
};
const container: AppContainer<Record<string, never>> = { env, logger, modules: {} };

async function importStartHttpServerModule(): Promise<StartHttpServerModule> {
    return (await import('../../../src/app/startHttpServer')) as StartHttpServerModule;
}

describe('startHttpServer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('starts the Express adapter when Bun runtime is not available', async () => {
        const close: Spy = vi.fn((callback: (error?: Error) => void): void => callback());
        const once: Spy = vi.fn();
        const listen: Spy = vi.fn((_port: number, _host: string, onListen: () => void) => {
            onListen();
            return { close, once };
        });
        const createApp: Spy = vi.fn(() => ({ listen } as unknown as Express));

        vi.doMock('../../../src/app/createApp', () => ({ createApp }));
        vi.doMock('../../../src/app/createBunServer', () => ({ getBunRuntime: vi.fn(() => undefined), startBunServer: vi.fn() }));

        const startHttpServerModule: StartHttpServerModule = await importStartHttpServerModule();
        const server = await startHttpServerModule.startHttpServer({ container, createHttpModules });

        expect(startHttpServerModule.isBunRuntime()).toBe(false);
        expect(createApp).toHaveBeenCalled();
        expect(listen).toHaveBeenCalledWith(3000, '127.0.0.1', expect.any(Function));

        await server.stop();

        expect(server.runtime).toBe('node');
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('delegates to the Bun adapter when Bun runtime is available', async () => {
        const bunServer = { runtime: 'bun' as const, stop: vi.fn((): Promise<void> => Promise.resolve()) };
        const startBunServer: Spy = vi.fn(() => Promise.resolve(bunServer));

        vi.doMock('../../../src/app/createApp', () => ({ createApp: vi.fn() }));
        vi.doMock('../../../src/app/createBunServer', () => ({ getBunRuntime: vi.fn(() => ({ serve: vi.fn() })), startBunServer }));

        const startHttpServerModule: StartHttpServerModule = await importStartHttpServerModule();
        const server = await startHttpServerModule.startHttpServer({ container, createHttpModules });

        expect(startHttpServerModule.isBunRuntime()).toBe(true);
        expect(startBunServer).toHaveBeenCalledWith({ container, createHttpModules });
        expect(server).toBe(bunServer);
    });

    it('propagates Express shutdown errors', async () => {
        const close: Spy = vi.fn((callback: (error?: Error) => void): void => callback(new Error('close failure')));
        const once: Spy = vi.fn();
        const listen: Spy = vi.fn((_port: number, _host: string, onListen: () => void) => {
            onListen();
            return { close, once };
        });
        const createApp: Spy = vi.fn(() => ({ listen } as unknown as Express));

        vi.doMock('../../../src/app/createApp', () => ({ createApp }));
        vi.doMock('../../../src/app/createBunServer', () => ({ getBunRuntime: vi.fn(() => undefined), startBunServer: vi.fn() }));

        const startHttpServerModule: StartHttpServerModule = await importStartHttpServerModule();
        const server = await startHttpServerModule.startHttpServer({ container, createHttpModules });

        await expect(server.stop()).rejects.toThrow('close failure');
    });
});
