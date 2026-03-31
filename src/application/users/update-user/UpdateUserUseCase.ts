import type { User } from '../../../domain/users/User';
import { UserEmail } from '../../../domain/users/UserEmail';
import { UserId } from '../../../domain/users/UserId';
import type { UserRepository } from '../../../domain/users/UserRepository';
import { ConflictError, NotFoundError } from '../../shared/ApplicationError';
import type { Clock } from '../../shared/ports/Clock';
import type { Logger } from '../../shared/ports/Logger';
import type { TransactionManager } from '../../shared/ports/TransactionManager';
import type { UseCase } from '../../shared/UseCase';
import { toUserResponse, type UserResponse } from '../UserResponse';
import type { UpdateUserCommand } from './UpdateUserCommand';

interface UpdateUserDependencies {
    userRepository: UserRepository;
    clock: Clock;
    logger: Logger;
    transactionManager: TransactionManager;
}

export class UpdateUserUseCase implements UseCase<UpdateUserCommand, UserResponse> {
    constructor(private readonly dependencies: UpdateUserDependencies) {}

    public async execute(command: UpdateUserCommand): Promise<UserResponse> {
        const user: User | null = await this.dependencies.userRepository.findById(new UserId(command.id));

        if (user === null) {
            throw new NotFoundError('User not found', 'USER_NOT_FOUND');
        }

        const currentUser: ReturnType<User['toPrimitives']> = user.toPrimitives();
        const nextEmail: UserEmail = new UserEmail(command.email);
        if (currentUser.email !== nextEmail.value) {
            const existingUser: User | null = await this.dependencies.userRepository.findByEmail(nextEmail);

            if (existingUser !== null && existingUser.id.value !== user.id.value) {
                throw new ConflictError('A user with the same email already exists', 'USER_ALREADY_EXISTS');
            }
        }

        return this.dependencies.transactionManager.runInTransaction(async (): Promise<UserResponse> => {
            const now: Date = this.dependencies.clock.now();

            if (currentUser.name !== command.name.trim()) {
                user.rename(command.name, now);
            }

            if (currentUser.email !== nextEmail.value) {
                user.changeEmail(nextEmail.value, now);
            }

            await this.dependencies.userRepository.save(user);

            this.dependencies.logger.info('User updated', { userId: user.id.value });

            return toUserResponse(user);
        });
    }
}
