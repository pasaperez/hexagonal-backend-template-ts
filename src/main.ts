import 'dotenv/config';
import { type ApplicationModules, createApplicationModules } from './app/composition/createApplicationModules';
import type { RunningHttpServer } from './app/createBunServer';
import { type AppContainer, createContainer } from './app/createContainer';
import { startHttpServer } from './app/startHttpServer';
import { type Environment, loadEnvironment } from './infrastructure/config/env';
import { createHttpModules } from './infrastructure/http/modules';

type BootstrapFailureDetails = { message: string; name: string; stack: string | undefined; } | { error: string; };

async function bootstrap(): Promise<void> {
    const env: Environment = loadEnvironment();
    const container: AppContainer<ApplicationModules> = createContainer({ createModules: createApplicationModules, env });
    const server: RunningHttpServer = await startHttpServer({ container, createHttpModules });

    const shutdown: (signal: NodeJS.Signals) => Promise<void> = async (signal: NodeJS.Signals): Promise<void> => {
        container.logger.info('Shutdown signal received', { signal });

        try {
            await server.stop();
            container.logger.info('HTTP server stopped');
            process.exit(0);
        } catch (error: unknown) {
            container.logger.error('Error while closing server', { message: error instanceof Error ? error.message : String(error) });
            process.exit(1);
        }
    };

    process.on('SIGINT', (): void => {
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', (): void => {
        void shutdown('SIGTERM');
    });
}

void bootstrap().catch((error: unknown): never => {
    const details: BootstrapFailureDetails = error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : { error: String(error) };

    console.error('Failed to bootstrap application', details);
    process.exit(1);
});
