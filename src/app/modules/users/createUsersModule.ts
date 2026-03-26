import { CreateUserUseCase } from '../../../application/users/create-user/CreateUserUseCase';
import { GetUserByIdUseCase } from '../../../application/users/get-user-by-id/GetUserByIdUseCase';
import { ListUsersUseCase } from '../../../application/users/list-users/ListUsersUseCase';
import { InMemoryUserRepository } from '../../../infrastructure/persistence/users/InMemoryUserRepository';
import type { SharedModuleDependencies } from '../SharedModuleDependencies';

export interface UsersModule {
    createUser: CreateUserUseCase;
    getUserById: GetUserByIdUseCase;
    listUsers: ListUsersUseCase;
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
        getUserById: new GetUserByIdUseCase({ userRepository }),
        listUsers: new ListUsersUseCase(userRepository)
    };
}
