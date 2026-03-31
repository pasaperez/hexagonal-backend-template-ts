import { User } from '../../../domain/users/User';
import type { UserPrimitives } from '../../../domain/users/User';
import type { UserEmail } from '../../../domain/users/UserEmail';
import type { UserId } from '../../../domain/users/UserId';
import type { UserRepository } from '../../../domain/users/UserRepository';

export class InMemoryUserRepository implements UserRepository {
    private readonly users = new Map<string, UserPrimitives>();

    public save(user: User): Promise<void> {
        this.users.set(user.id.value, user.toPrimitives());
        return Promise.resolve();
    }

    public delete(id: UserId): Promise<void> {
        this.users.delete(id.value);
        return Promise.resolve();
    }

    public findById(id: UserId): Promise<User | null> {
        const user: UserPrimitives | undefined = this.users.get(id.value);
        return Promise.resolve(user ? User.fromPrimitives(user) : null);
    }

    public findByEmail(email: UserEmail): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.email === email.value) {
                return Promise.resolve(User.fromPrimitives(user));
            }
        }

        return Promise.resolve(null);
    }

    public findAll(): Promise<User[]> {
        return Promise.resolve(
            [...this.users.values()].sort((left: UserPrimitives, right: UserPrimitives): number =>
                left.createdAt.localeCompare(right.createdAt)
            ).map((user: UserPrimitives): User => User.fromPrimitives(user))
        );
    }
}
