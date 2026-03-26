import type { User } from '../../domain/users/User';

export interface UserResponse {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export function toUserResponse(user: User): UserResponse {
    return user.toPrimitives();
}
