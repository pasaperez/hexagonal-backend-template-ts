import { type Environment, loadEnvironment } from '../infrastructure/config/env';
import { PinoLogger } from '../infrastructure/logging/PinoLogger';
import { InMemoryEventBus } from '../infrastructure/system/InMemoryEventBus';
import { NodeClock } from '../infrastructure/system/NodeClock';
import { NodeIdGenerator } from '../infrastructure/system/NodeIdGenerator';
import { NodeUptimeProvider } from '../infrastructure/system/NodeUptimeProvider';
import { NoopTransactionManager } from '../infrastructure/system/NoopTransactionManager';
import type { SharedModuleDependencies } from './modules/SharedModuleDependencies';

export interface AppContainer<TModules> {
    env: Environment;
    logger: PinoLogger;
    modules: TModules;
}

export interface CreateContainerOptions<TModules> {
    createModules: (dependencies: SharedModuleDependencies) => TModules;
    env?: Environment;
}

export function createContainer<TModules>(
    { createModules, env = loadEnvironment() }: CreateContainerOptions<TModules>
): AppContainer<TModules> {
    const logger: PinoLogger = PinoLogger.create(env.LOG_LEVEL, env.APP_NAME);
    const clock: NodeClock = new NodeClock();
    const idGenerator: NodeIdGenerator = new NodeIdGenerator();
    const transactionManager: NoopTransactionManager = new NoopTransactionManager();
    const uptimeProvider: NodeUptimeProvider = new NodeUptimeProvider();
    const eventBus: InMemoryEventBus = new InMemoryEventBus(logger.child({ component: 'event-bus' }));
    const sharedDependencies: SharedModuleDependencies = {
        clock,
        createLogger: (bindings: Record<string, unknown>): PinoLogger => logger.child(bindings),
        env,
        eventBus,
        idGenerator,
        logger,
        transactionManager,
        uptimeProvider
    };

    return { env, logger, modules: createModules(sharedDependencies) };
}
