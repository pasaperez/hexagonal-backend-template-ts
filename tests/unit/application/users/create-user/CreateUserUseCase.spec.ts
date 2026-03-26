import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../../src/application/shared/ApplicationError';
import type { EventBus } from '../../../../../src/application/shared/ports/EventBus';
import type { Logger } from '../../../../../src/application/shared/ports/Logger';
import type { TransactionManager } from '../../../../../src/application/shared/ports/TransactionManager';
import { CreateUserUseCase } from '../../../../../src/application/users/create-user/CreateUserUseCase';
import type { UserResponse } from '../../../../../src/application/users/UserResponse';
import { User } from '../../../../../src/domain/users/User';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/users/InMemoryUserRepository';

type Spy = ReturnType<typeof vi.fn>;

describe('CreateUserUseCase', () => {
    it('creates a user and publishes its domain events', async () => {
        const now: Date = new Date('2026-01-01T10:00:00.000Z');
        const repository: InMemoryUserRepository = new InMemoryUserRepository();
        const eventBus: Pick<EventBus, 'publish'> = { publish: vi.fn().mockResolvedValue(undefined) };
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const transactionManager: TransactionManager = {
            runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation()
        };

        const useCase: CreateUserUseCase = new CreateUserUseCase({
            clock: { now: (): Date => now },
            eventBus,
            idGenerator: { generate: (): string => '5f89458a-01cf-49ef-bd14-e238041bcd4b' },
            logger,
            transactionManager,
            userRepository: repository
        });

        const result: UserResponse = await useCase.execute({ email: '  jane.doe@example.com ', name: 'Jane Doe' });

        expect(result).toEqual({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'jane.doe@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Jane Doe',
            updatedAt: '2026-01-01T10:00:00.000Z'
        });
        expect(eventBus.publish as Spy).toHaveBeenCalledTimes(1);
        expect(logger.info as Spy).toHaveBeenCalledWith('User created', { userId: '5f89458a-01cf-49ef-bd14-e238041bcd4b' });
    });

    it('rejects duplicated emails', async () => {
        const now: Date = new Date('2026-01-01T10:00:00.000Z');
        const repository: InMemoryUserRepository = new InMemoryUserRepository();

        await repository.save(
            User.create({ email: 'existing@example.com', id: '5f89458a-01cf-49ef-bd14-e238041bcd4b', name: 'Existing User', now })
        );

        const useCase: CreateUserUseCase = new CreateUserUseCase({
            clock: { now: (): Date => now },
            eventBus: { publish: (): Promise<void> => Promise.resolve(undefined) },
            idGenerator: { generate: (): string => 'f4de9bfe-9766-4507-b6b5-c6f92069c89a' },
            logger: {
                debug: (): void => undefined,
                error: (): void => undefined,
                info: (): void => undefined,
                warn: (): void => undefined
            },
            transactionManager: { runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => operation() },
            userRepository: repository
        });

        await expect(useCase.execute({ email: 'existing@example.com', name: 'Another User' })).rejects.toBeInstanceOf(ConflictError);
    });
});
