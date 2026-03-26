import { z } from 'zod';
import type { UsersModule } from '../../../app/modules';
import type { CreateUserCommand } from '../../../application/users/create-user/CreateUserCommand';
import type { GetUserByIdQuery } from '../../../application/users/get-user-by-id/GetUserByIdQuery';
import type { UserResponse } from '../../../application/users/UserResponse';
import type { HttpRequest, HttpRoute } from '../HttpModule';

const createUserBodySchema: z.ZodType<CreateUserCommand> = z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(100)
});

const userIdParamsSchema: z.ZodType<GetUserByIdQuery> = z.object({ id: z.string().uuid() });

export function createUsersRoutes(dependencies: Pick<UsersModule, 'createUser' | 'getUserById' | 'listUsers'>): HttpRoute[] {
    return [{
        handler: async (): Promise<{ body: { items: UserResponse[]; }; statusCode: number; }> => {
            const users: UserResponse[] = await dependencies.listUsers.execute();

            return { body: { items: users }, statusCode: 200 };
        },
        method: 'GET',
        path: '/'
    }, {
        handler: async (request: HttpRequest): Promise<{ body: UserResponse; statusCode: number; }> => {
            const params: GetUserByIdQuery = userIdParamsSchema.parse(request.params);
            const user: UserResponse = await dependencies.getUserById.execute(params);

            return { body: user, statusCode: 200 };
        },
        method: 'GET',
        path: '/:id'
    }, {
        handler: async (request: HttpRequest): Promise<{ body: UserResponse; statusCode: number; }> => {
            const body: CreateUserCommand = createUserBodySchema.parse(request.body);
            const user: UserResponse = await dependencies.createUser.execute(body);

            return { body: user, statusCode: 201 };
        },
        method: 'POST',
        path: '/'
    }];
}
