import { createSystemModule, createUsersModule, type SystemModule, type UsersModule } from '../modules';
import type { SharedModuleDependencies } from '../modules/SharedModuleDependencies';

export interface ApplicationModules {
    system: SystemModule;
    users: UsersModule;
}

export function createApplicationModules(dependencies: SharedModuleDependencies): ApplicationModules {
    return { system: createSystemModule(dependencies), users: createUsersModule(dependencies) };
}
