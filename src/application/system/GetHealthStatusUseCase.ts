import { HealthStatus, type HealthStatusPrimitives } from '../../domain/system/HealthStatus';
import type { Clock } from '../shared/ports/Clock';
import type { UptimeProvider } from '../shared/ports/UptimeProvider';
import type { UseCase } from '../shared/UseCase';

interface GetHealthStatusDependencies {
    clock: Clock;
    uptimeProvider: UptimeProvider;
    applicationName: string;
    applicationVersion: string;
    environment: string;
}

export class GetHealthStatusUseCase implements UseCase<void, HealthStatusPrimitives> {
    constructor(private readonly dependencies: GetHealthStatusDependencies) {}

    public execute(_input?: void): Promise<HealthStatusPrimitives> {
        const status: HealthStatus = new HealthStatus({
            environment: this.dependencies.environment,
            name: this.dependencies.applicationName,
            timestamp: this.dependencies.clock.now(),
            uptimeSeconds: this.dependencies.uptimeProvider.getUptimeSeconds(),
            version: this.dependencies.applicationVersion
        });

        return Promise.resolve(status.toPrimitives());
    }
}
