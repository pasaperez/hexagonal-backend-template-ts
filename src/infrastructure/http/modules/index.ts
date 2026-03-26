import type { ApplicationModules } from '../../../app/composition/createApplicationModules';
import type { HttpModule } from '../HttpModule';
import { createSystemHttpModule } from './createSystemHttpModule';
import { createUsersHttpModule } from './createUsersHttpModule';

export function createHttpModules(modules: ApplicationModules): HttpModule[] {
    return [createSystemHttpModule(modules.system), createUsersHttpModule(modules.users)];
}
