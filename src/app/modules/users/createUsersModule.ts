import { CreateUserUseCase } from '../../../application/users/create-user/CreateUserUseCase';
import { DeleteUserUseCase } from '../../../application/users/delete-user/DeleteUserUseCase';
import { GetUserByIdUseCase } from '../../../application/users/get-user-by-id/GetUserByIdUseCase';
import { ListUsersUseCase } from '../../../application/users/list-users/ListUsersUseCase';
import { UpdateUserUseCase } from '../../../application/users/update-user/UpdateUserUseCase';
import { InMemoryUserRepository } from '../../../infrastructure/persistence/users/InMemoryUserRepository';
import type { SharedModuleDependencies } from '../SharedModuleDependencies';

export interface UsersModule {
    createUser: CreateUserUseCase;
    deleteUser: DeleteUserUseCase;
    getUserById: GetUserByIdUseCase;
    listUsers: ListUsersUseCase;
    updateUser: UpdateUserUseCase;
}

export function createUsersModule(dependencies: SharedModuleDependencies): UsersModule {
    const userRepository: InMemoryUserRepository = new InMemoryUserRepository();
    return {
        createUser: new CreateUserUseCase({
            clock: dependencies.clock,
            eventBus: dependencies.eventBus,
            idGenerator: dependencies.idGenerator,
            logger: dependencies.createLogger({ module: 'users', useCase: 'CreateUserUseCase' }),
            transactionManager: dependencies.transactionManager,
            userRepository
        }),
        deleteUser: new DeleteUserUseCase({
            logger: dependencies.createLogger({ module: 'users', useCase: 'DeleteUserUseCase' }),
            transactionManager: dependencies.transactionManager,
            userRepository
        }),
        getUserById: new GetUserByIdUseCase({ userRepository }),
        listUsers: new ListUsersUseCase(userRepository),
        updateUser: new UpdateUserUseCase({
            clock: dependencies.clock,
            logger: dependencies.createLogger({ module: 'users', useCase: 'UpdateUserUseCase' }),
            transactionManager: dependencies.transactionManager,
            userRepository
        })
    };
}
