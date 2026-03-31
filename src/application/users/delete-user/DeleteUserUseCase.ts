import type { User } from '../../../domain/users/User';
import { UserId } from '../../../domain/users/UserId';
import type { UserRepository } from '../../../domain/users/UserRepository';
import { NotFoundError } from '../../shared/ApplicationError';
import type { Logger } from '../../shared/ports/Logger';
import type { TransactionManager } from '../../shared/ports/TransactionManager';
import type { UseCase } from '../../shared/UseCase';
import type { DeleteUserCommand } from './DeleteUserCommand';

interface DeleteUserDependencies {
    userRepository: UserRepository;
    logger: Logger;
    transactionManager: TransactionManager;
}

export class DeleteUserUseCase implements UseCase<DeleteUserCommand, void> {
    constructor(private readonly dependencies: DeleteUserDependencies) {}

    public async execute(command: DeleteUserCommand): Promise<void> {
        const user: User | null = await this.dependencies.userRepository.findById(new UserId(command.id));

        if (user === null) {
            throw new NotFoundError('User not found', 'USER_NOT_FOUND');
        }

        await this.dependencies.transactionManager.runInTransaction(async (): Promise<void> => {
            await this.dependencies.userRepository.delete(user.id);
            this.dependencies.logger.info('User deleted', { userId: user.id.value });
        });
    }
}
