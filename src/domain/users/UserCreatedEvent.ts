import type { DomainEvent } from '../shared/DomainEvent';

export class UserCreatedEvent implements DomainEvent {
    public readonly eventName = 'users.user.created';

    constructor(public readonly aggregateId: string, public readonly email: string, public readonly occurredOn: Date) {}

    public toPrimitives(): Record<string, unknown> {
        return { email: this.email };
    }
}
