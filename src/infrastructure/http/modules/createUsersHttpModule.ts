import type { UsersModule } from '../../../app/modules';
import type { HttpModule } from '../HttpModule';
import { createUsersRoutes } from '../routes/users.routes';

export function createUsersHttpModule(usersModule: UsersModule): HttpModule {
    return { basePath: '/api/v1/users', key: 'users', routes: createUsersRoutes(usersModule) };
}
