import { User } from '../../../domain/users/User';
import { UserEmail } from '../../../domain/users/UserEmail';
import type { UserRepository } from '../../../domain/users/UserRepository';
import { ConflictError } from '../../shared/ApplicationError';
import type { Clock } from '../../shared/ports/Clock';
import type { EventBus } from '../../shared/ports/EventBus';
import type { IdGenerator } from '../../shared/ports/IdGenerator';
import type { Logger } from '../../shared/ports/Logger';
import type { TransactionManager } from '../../shared/ports/TransactionManager';
import type { UseCase } from '../../shared/UseCase';
import { toUserResponse, type UserResponse } from '../UserResponse';
import type { CreateUserCommand } from './CreateUserCommand';

interface CreateUserDependencies {
    userRepository: UserRepository;
    idGenerator: IdGenerator;
    clock: Clock;
    eventBus: EventBus;
    logger: Logger;
    transactionManager: TransactionManager;
}

export class CreateUserUseCase implements UseCase<CreateUserCommand, UserResponse> {
    constructor(private readonly dependencies: CreateUserDependencies) {}

    public async execute(command: CreateUserCommand): Promise<UserResponse> {
        const existingUser: User | null = await this.dependencies.userRepository.findByEmail(new UserEmail(command.email));

        if (existingUser !== null) {
            throw new ConflictError('A user with the same email already exists', 'USER_ALREADY_EXISTS');
        }

        return this.dependencies.transactionManager.runInTransaction(async (): Promise<UserResponse> => {
            const now: Date = this.dependencies.clock.now();
            const user: User = User.create({ email: command.email, id: this.dependencies.idGenerator.generate(), name: command.name, now });

            await this.dependencies.userRepository.save(user);
            await this.dependencies.eventBus.publish(user.pullDomainEvents());

            this.dependencies.logger.info('User created', { userId: user.id.value });

            return toUserResponse(user);
        });
    }
}
