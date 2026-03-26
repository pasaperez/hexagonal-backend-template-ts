import type { DomainEvent } from '../../../domain/shared/DomainEvent';

export interface EventBus {
    publish(events: DomainEvent[]): Promise<void>;
}
