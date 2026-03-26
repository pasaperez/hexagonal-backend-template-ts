import type { SystemModule } from '../../../app/modules';
import type { HttpModule } from '../HttpModule';
import { createHealthRoutes } from '../routes/health.routes';

export function createSystemHttpModule(systemModule: SystemModule): HttpModule {
    return { basePath: '/health', key: 'health', routes: createHealthRoutes(systemModule) };
}
