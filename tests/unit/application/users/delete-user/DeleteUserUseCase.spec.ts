import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../../../src/application/shared/ApplicationError';
import type { Logger } from '../../../../../src/application/shared/ports/Logger';
import type { TransactionManager } from '../../../../../src/application/shared/ports/TransactionManager';
import { DeleteUserUseCase } from '../../../../../src/application/users/delete-user/DeleteUserUseCase';
import { User } from '../../../../../src/domain/users/User';
import { UserId } from '../../../../../src/domain/users/UserId';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/users/InMemoryUserRepository';

type Spy = ReturnType<typeof vi.fn>;

describe('DeleteUserUseCase', () => {
    it('deletes an existing user', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const transactionManager: TransactionManager = {
            runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation()
        };

        await repository.save(
            User.create({
                email: 'alice@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'Alice',
                now: new Date('2026-01-01T10:00:00.000Z')
            })
        );

        const useCase: DeleteUserUseCase = new DeleteUserUseCase({ logger, transactionManager, userRepository: repository });

        await expect(useCase.execute({ id: '5f89458a-01cf-49ef-bd14-e238041bcd4b' })).resolves.toBeUndefined();
        await expect(repository.findById(new UserId('5f89458a-01cf-49ef-bd14-e238041bcd4b'))).resolves.toBeNull();
        expect(logger.info as Spy).toHaveBeenCalledWith('User deleted', { userId: '5f89458a-01cf-49ef-bd14-e238041bcd4b' });
    });

    it('rejects missing users', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();
        const useCase: DeleteUserUseCase = new DeleteUserUseCase({
            logger: {
                debug: (): void => undefined,
                error: (): void => undefined,
                info: (): void => undefined,
                warn: (): void => undefined
            },
            transactionManager: { runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation() },
            userRepository: repository
        });

        await expect(useCase.execute({ id: '99b20e0b-0900-4f62-b5f2-b6bf78336154' })).rejects.toBeInstanceOf(NotFoundError);
    });
});
