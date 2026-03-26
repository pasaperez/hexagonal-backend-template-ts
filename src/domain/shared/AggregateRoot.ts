import type { DomainEvent } from './DomainEvent';
import { Entity } from './Entity';

export abstract class AggregateRoot<Id> extends Entity<Id> {
    private readonly domainEvents: DomainEvent[] = [];

    protected record(event: DomainEvent): void {
        this.domainEvents.push(event);
    }

    public pullDomainEvents(): DomainEvent[] {
        return this.domainEvents.splice(0, this.domainEvents.length);
    }
}
