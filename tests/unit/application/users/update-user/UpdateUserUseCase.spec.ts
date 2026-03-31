import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '../../../../../src/application/shared/ApplicationError';
import type { Logger } from '../../../../../src/application/shared/ports/Logger';
import type { TransactionManager } from '../../../../../src/application/shared/ports/TransactionManager';
import { UpdateUserUseCase } from '../../../../../src/application/users/update-user/UpdateUserUseCase';
import { type UserResponse } from '../../../../../src/application/users/UserResponse';
import { User } from '../../../../../src/domain/users/User';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/users/InMemoryUserRepository';

type Spy = ReturnType<typeof vi.fn>;

describe('UpdateUserUseCase', () => {
    it('updates an existing user and keeps the response normalized', async () => {
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

        const useCase: UpdateUserUseCase = new UpdateUserUseCase({
            clock: { now: (): Date => new Date('2026-01-02T10:00:00.000Z') },
            logger,
            transactionManager,
            userRepository: repository
        });

        const result: UserResponse = await useCase.execute({
            email: '  Alice.Smith@Example.com ',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: '  Alice Smith  '
        });

        expect(result).toEqual({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'alice.smith@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Alice Smith',
            updatedAt: '2026-01-02T10:00:00.000Z'
        });
        expect(logger.info as Spy).toHaveBeenCalledWith('User updated', { userId: '5f89458a-01cf-49ef-bd14-e238041bcd4b' });
    });

    it('rejects missing users and duplicated emails', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();

        await repository.save(
            User.create({
                email: 'existing@example.com',
                id: 'f4de9bfe-9766-4507-b6b5-c6f92069c89a',
                name: 'Existing User',
                now: new Date('2026-01-01T10:00:00.000Z')
            })
        );
        await repository.save(
            User.create({
                email: 'alice@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'Alice',
                now: new Date('2026-01-01T10:00:00.000Z')
            })
        );

        const useCase: UpdateUserUseCase = new UpdateUserUseCase({
            clock: { now: (): Date => new Date('2026-01-02T10:00:00.000Z') },
            logger: {
                debug: (): void => undefined,
                error: (): void => undefined,
                info: (): void => undefined,
                warn: (): void => undefined
            },
            transactionManager: { runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation() },
            userRepository: repository
        });

        await expect(useCase.execute({ email: 'ghost@example.com', id: '99b20e0b-0900-4f62-b5f2-b6bf78336154', name: 'Ghost User' }))
            .rejects.toBeInstanceOf(NotFoundError);

        await expect(useCase.execute({ email: 'existing@example.com', id: '5f89458a-01cf-49ef-bd14-e238041bcd4b', name: 'Alice' })).rejects
            .toBeInstanceOf(ConflictError);
    });

    it('allows updates that keep the same normalized values', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();

        await repository.save(
            User.create({
                email: 'alice@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'Alice',
                now: new Date('2026-01-01T10:00:00.000Z')
            })
        );

        const useCase: UpdateUserUseCase = new UpdateUserUseCase({
            clock: { now: (): Date => new Date('2026-01-02T10:00:00.000Z') },
            logger: {
                debug: (): void => undefined,
                error: (): void => undefined,
                info: (): void => undefined,
                warn: (): void => undefined
            },
            transactionManager: { runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation() },
            userRepository: repository
        });

        await expect(useCase.execute({ email: '  ALICE@EXAMPLE.COM ', id: '5f89458a-01cf-49ef-bd14-e238041bcd4b', name: ' Alice ' }))
            .resolves.toEqual({
                createdAt: '2026-01-01T10:00:00.000Z',
                email: 'alice@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'Alice',
                updatedAt: '2026-01-01T10:00:00.000Z'
            });
    });
});
