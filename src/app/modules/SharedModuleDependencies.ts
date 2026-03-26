import type { Clock } from '../../application/shared/ports/Clock';
import type { EventBus } from '../../application/shared/ports/EventBus';
import type { IdGenerator } from '../../application/shared/ports/IdGenerator';
import type { Logger } from '../../application/shared/ports/Logger';
import type { TransactionManager } from '../../application/shared/ports/TransactionManager';
import type { UptimeProvider } from '../../application/shared/ports/UptimeProvider';
import type { Environment } from '../../infrastructure/config/env';

export interface SharedModuleDependencies {
    env: Environment;
    clock: Clock;
    eventBus: EventBus;
    idGenerator: IdGenerator;
    logger: Logger;
    transactionManager: TransactionManager;
    uptimeProvider: UptimeProvider;
    createLogger(bindings: Record<string, unknown>): Logger;
}
