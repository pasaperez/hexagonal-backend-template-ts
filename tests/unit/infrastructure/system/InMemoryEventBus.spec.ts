import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../../src/application/shared/ports/Logger';
import { InMemoryEventBus } from '../../../../src/infrastructure/system/InMemoryEventBus';

type Spy = ReturnType<typeof vi.fn>;

describe('InMemoryEventBus', () => {
    it('logs every published domain event and ignores empty batches', async () => {
        const logger: Logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const eventBus: InMemoryEventBus = new InMemoryEventBus(logger);

        await eventBus.publish([]);
        await eventBus.publish([{
            aggregateId: 'user-1',
            eventName: 'users.user.created',
            occurredOn: new Date('2026-01-01T10:00:00.000Z'),
            toPrimitives: () => ({ email: 'jane.doe@example.com' })
        }]);

        expect(logger.info as Spy).toHaveBeenCalledTimes(1);
        expect(logger.info as Spy).toHaveBeenCalledWith('Domain event published', {
            aggregateId: 'user-1',
            eventName: 'users.user.created',
            payload: { email: 'jane.doe@example.com' }
        });
    });
});
