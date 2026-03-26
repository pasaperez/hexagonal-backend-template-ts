import type { Server } from 'node:http';
import type { CreateAppOptions } from './createApp';
import { createApp } from './createApp';
import { getBunRuntime, type RunningHttpServer, startBunServer } from './createBunServer';

export function isBunRuntime(): boolean {
    return getBunRuntime() !== undefined;
}

export async function startHttpServer<TModules>(options: CreateAppOptions<TModules>): Promise<RunningHttpServer> {
    if (isBunRuntime()) {
        return startBunServer(options);
    }

    return startExpressServer(options);
}

async function startExpressServer<TModules>(options: CreateAppOptions<TModules>): Promise<RunningHttpServer> {
    const app: ReturnType<typeof createApp> = createApp(options);

    return new Promise<RunningHttpServer>((resolve: (server: RunningHttpServer) => void, reject: (error: Error) => void): void => {
        const server: Server = app.listen(options.container.env.PORT, options.container.env.HOST, (): void => {
            options.container.logger.info('HTTP server listening', { host: options.container.env.HOST, port: options.container.env.PORT });
            resolve({
                runtime: 'node',
                stop: async (): Promise<void> => {
                    await new Promise<void>((resolveStop: () => void, rejectStop: (error: Error) => void): void => {
                        server.close((error?: Error): void => {
                            if (error) {
                                rejectStop(error);
                                return;
                            }

                            resolveStop();
                        });
                    });
                }
            });
        });

        server.once('error', reject);
    });
}
