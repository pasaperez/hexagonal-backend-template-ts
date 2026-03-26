import { AggregateRoot } from '../shared/AggregateRoot';
import { UserCreatedEvent } from './UserCreatedEvent';
import { UserEmail } from './UserEmail';
import { UserId } from './UserId';
import { UserName } from './UserName';

export interface UserPrimitives {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateUserProps {
    id: string;
    name: string;
    email: string;
    now: Date;
}

export class User extends AggregateRoot<UserId> {
    private constructor(
        id: UserId,
        private name: UserName,
        private email: UserEmail,
        private readonly createdAt: Date,
        private updatedAt: Date
    ) {
        super(id);
    }

    public static create(props: CreateUserProps): User {
        const user: User = new User(new UserId(props.id), new UserName(props.name), new UserEmail(props.email), props.now, props.now);
        user.record(new UserCreatedEvent(user.id.value, user.email.value, props.now));
        return user;
    }

    public static fromPrimitives(primitives: UserPrimitives): User {
        return new User(
            new UserId(primitives.id),
            new UserName(primitives.name),
            new UserEmail(primitives.email),
            new Date(primitives.createdAt),
            new Date(primitives.updatedAt)
        );
    }

    public rename(name: string, now: Date): void {
        this.name = new UserName(name);
        this.updatedAt = now;
    }

    public changeEmail(email: string, now: Date): void {
        this.email = new UserEmail(email);
        this.updatedAt = now;
    }

    public toPrimitives(): UserPrimitives {
        return {
            createdAt: this.createdAt.toISOString(),
            email: this.email.value,
            id: this.id.value,
            name: this.name.value,
            updatedAt: this.updatedAt.toISOString()
        };
    }
}
