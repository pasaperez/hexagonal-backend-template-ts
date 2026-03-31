import { z } from 'zod';
import type { UsersModule } from '../../../app/modules';
import type { CreateUserCommand } from '../../../application/users/create-user/CreateUserCommand';
import type { DeleteUserCommand } from '../../../application/users/delete-user/DeleteUserCommand';
import type { GetUserByIdQuery } from '../../../application/users/get-user-by-id/GetUserByIdQuery';
import type { UpdateUserCommand } from '../../../application/users/update-user/UpdateUserCommand';
import type { UserResponse } from '../../../application/users/UserResponse';
import type { HttpRequest, HttpRoute } from '../HttpModule';

const createUserBodySchema: z.ZodType<CreateUserCommand> = z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(100)
});

const userIdParamsSchema: z.ZodType<GetUserByIdQuery> = z.object({ id: z.string().uuid() });
const updateUserBodySchema: z.ZodType<Omit<UpdateUserCommand, 'id'>> = z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(100)
});

export function createUsersRoutes(
    dependencies: Pick<UsersModule, 'createUser' | 'deleteUser' | 'getUserById' | 'listUsers' | 'updateUser'>
): HttpRoute[] {
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
    }, {
        handler: async (request: HttpRequest): Promise<{ body: UserResponse; statusCode: number; }> => {
            const params: GetUserByIdQuery = userIdParamsSchema.parse(request.params);
            const body: Omit<UpdateUserCommand, 'id'> = updateUserBodySchema.parse(request.body);
            const user: UserResponse = await dependencies.updateUser.execute({ ...body, id: params.id });

            return { body: user, statusCode: 200 };
        },
        method: 'PUT',
        path: '/:id'
    }, {
        handler: async (request: HttpRequest): Promise<{ statusCode: number; }> => {
            const command: DeleteUserCommand = userIdParamsSchema.parse(request.params);

            await dependencies.deleteUser.execute(command);

            return { statusCode: 204 };
        },
        method: 'DELETE',
        path: '/:id'
    }];
}
