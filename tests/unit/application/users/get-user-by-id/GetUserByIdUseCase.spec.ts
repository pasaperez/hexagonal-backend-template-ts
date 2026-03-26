import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../../../src/application/shared/ApplicationError';
import { GetUserByIdUseCase } from '../../../../../src/application/users/get-user-by-id/GetUserByIdUseCase';
import { User } from '../../../../../src/domain/users/User';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/users/InMemoryUserRepository';

describe('GetUserByIdUseCase', () => {
    it('returns a persisted user', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();

        await repository.save(
            User.create({
                email: 'jane.doe@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'Jane Doe',
                now: new Date('2026-01-01T10:00:00.000Z')
            })
        );

        const useCase: GetUserByIdUseCase = new GetUserByIdUseCase({ userRepository: repository });

        await expect(useCase.execute({ id: '5f89458a-01cf-49ef-bd14-e238041bcd4b' })).resolves.toEqual({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'jane.doe@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Jane Doe',
            updatedAt: '2026-01-01T10:00:00.000Z'
        });
    });

    it('throws when the user does not exist', async () => {
        const useCase: GetUserByIdUseCase = new GetUserByIdUseCase({ userRepository: new InMemoryUserRepository() });

        await expect(useCase.execute({ id: '5f89458a-01cf-49ef-bd14-e238041bcd4b' })).rejects.toBeInstanceOf(NotFoundError);
    });
});
