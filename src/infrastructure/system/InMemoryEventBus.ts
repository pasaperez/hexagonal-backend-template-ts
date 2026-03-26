import type { EventBus } from '../../application/shared/ports/EventBus';
import type { Logger } from '../../application/shared/ports/Logger';
import type { DomainEvent } from '../../domain/shared/DomainEvent';

export class InMemoryEventBus implements EventBus {
    constructor(private readonly logger: Logger) {}

    public publish(events: DomainEvent[]): Promise<void> {
        if (events.length === 0) {
            return Promise.resolve();
        }

        for (const event of events) {
            this.logger.info('Domain event published', {
                aggregateId: event.aggregateId,
                eventName: event.eventName,
                payload: event.toPrimitives()
            });
        }

        return Promise.resolve();
    }
}
