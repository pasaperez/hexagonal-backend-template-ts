import { describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../../../src/domain/shared/DomainEvent';
import { User } from '../../../../src/domain/users/User';

describe('User aggregate', () => {
    it('creates a normalized user and records a domain event', () => {
        const createdAt: Date = new Date('2026-01-01T10:00:00.000Z');
        const user: User = User.create({
            email: '  JANE.DOE@EXAMPLE.COM ',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: '  Jane Doe  ',
            now: createdAt
        });

        expect(user.toPrimitives()).toEqual({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'jane.doe@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Jane Doe',
            updatedAt: '2026-01-01T10:00:00.000Z'
        });

        const [event]: DomainEvent[] = user.pullDomainEvents();

        expect(event?.eventName).toBe('users.user.created');
        expect(event?.aggregateId).toBe('5f89458a-01cf-49ef-bd14-e238041bcd4b');
        expect(user.pullDomainEvents()).toHaveLength(0);
    });

    it('rehydrates an existing user and updates its mutable fields', () => {
        const user: User = User.fromPrimitives({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'jane.doe@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Jane Doe',
            updatedAt: '2026-01-01T10:00:00.000Z'
        });

        user.rename('  Jane Smith  ', new Date('2026-01-02T10:00:00.000Z'));
        user.changeEmail('  JANE.SMITH@EXAMPLE.COM  ', new Date('2026-01-03T10:00:00.000Z'));

        expect(user.toPrimitives()).toEqual({
            createdAt: '2026-01-01T10:00:00.000Z',
            email: 'jane.smith@example.com',
            id: '5f89458a-01cf-49ef-bd14-e238041bcd4b',
            name: 'Jane Smith',
            updatedAt: '2026-01-03T10:00:00.000Z'
        });
        expect(user.pullDomainEvents()).toHaveLength(0);
    });
});
