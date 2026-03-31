import { describe, expect, it } from 'vitest';
import { User } from '../../../../../src/domain/users/User';
import { UserEmail } from '../../../../../src/domain/users/UserEmail';
import { UserId } from '../../../../../src/domain/users/UserId';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/users/InMemoryUserRepository';

describe('InMemoryUserRepository', () => {
    it('persists and queries users in memory', async () => {
        const repository: InMemoryUserRepository = new InMemoryUserRepository();
        const newerUser: User = User.create({
            email: 'second@example.com',
            id: 'f4de9bfe-9766-4507-b6b5-c6f92069c89a',
            name: 'Second User',
            now: new Date('2026-01-02T10:00:00.000Z')
        });
        const olderUser: User = User.create({
            email: 'first@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'First User',
            now: new Date('2026-01-01T10:00:00.000Z')
        });

        await repository.save(newerUser);
        await repository.save(olderUser);

        await expect(repository.findById(new UserId('5f89458a-01cf-49ef-bd14-e238041bcd4b'))).resolves.toEqual(
            User.fromPrimitives({
                createdAt: '2026-01-01T10:00:00.000Z',
                email: 'first@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'First User',
                updatedAt: '2026-01-01T10:00:00.000Z'
            })
        );

        await expect(repository.findById(new UserId('99b20e0b-0900-4f62-b5f2-b6bf78336154'))).resolves.toBeNull();

        await expect(repository.findByEmail(new UserEmail('FIRST@example.com'))).resolves.toEqual(
            User.fromPrimitives({
                createdAt: '2026-01-01T10:00:00.000Z',
                email: 'first@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'First User',
                updatedAt: '2026-01-01T10:00:00.000Z'
            })
        );

        await expect(repository.findByEmail(new UserEmail('missing@example.com'))).resolves.toBeNull();

        await expect(repository.findAll()).resolves.toEqual([
            User.fromPrimitives({
                createdAt: '2026-01-01T10:00:00.000Z',
                email: 'first@example.com',
                id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
                name: 'First User',
                updatedAt: '2026-01-01T10:00:00.000Z'
            }),
            User.fromPrimitives({
                createdAt: '2026-01-02T10:00:00.000Z',
                email: 'second@example.com',
                id: 'f4de9bfe-9766-4507-b6b5-c6f92069c89a',
                name: 'Second User',
                updatedAt: '2026-01-02T10:00:00.000Z'
            })
        ]);

        await repository.delete(new UserId('5f89458a-01cf-49ef-bd14-e238041bcd4b'));

        await expect(repository.findById(new UserId('5f89458a-01cf-49ef-bd14-e238041bcd4b'))).resolves.toBeNull();
    });
});
