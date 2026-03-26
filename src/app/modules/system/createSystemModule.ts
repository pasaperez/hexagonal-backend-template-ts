import { GetHealthStatusUseCase } from '../../../application/system/GetHealthStatusUseCase';
import type { SharedModuleDependencies } from '../SharedModuleDependencies';

export interface SystemModule {
    getHealthStatus: GetHealthStatusUseCase;
}

export function createSystemModule(dependencies: SharedModuleDependencies): SystemModule {
    return {
        getHealthStatus: new GetHealthStatusUseCase({
            applicationName: dependencies.env.APP_NAME,
            applicationVersion: dependencies.env.APP_VERSION,
            clock: dependencies.clock,
            environment: dependencies.env.NODE_ENV,
            uptimeProvider: dependencies.uptimeProvider
        })
    };
}
