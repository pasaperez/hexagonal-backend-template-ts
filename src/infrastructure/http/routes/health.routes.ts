import type { SystemModule } from '../../../app/modules';
import type { HealthStatusPrimitives } from '../../../domain/system/HealthStatus';
import type { HttpRoute } from '../HttpModule';

export function createHealthRoutes(dependencies: Pick<SystemModule, 'getHealthStatus'>): HttpRoute[] {
    return [{
        handler: async (): Promise<{ body: HealthStatusPrimitives; statusCode: number; }> => {
            const status: HealthStatusPrimitives = await dependencies.getHealthStatus.execute();

            return { body: status, statusCode: 200 };
        },
        method: 'GET',
        path: '/'
    }];
}
