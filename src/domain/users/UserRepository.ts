import type { User } from './User';
import type { UserEmail } from './UserEmail';
import type { UserId } from './UserId';

export interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: UserId): Promise<User | null>;
    findByEmail(email: UserEmail): Promise<User | null>;
    findAll(): Promise<User[]>;
}
