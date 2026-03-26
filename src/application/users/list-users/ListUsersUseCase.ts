import type { User } from '../../../domain/users/User';
import type { UserRepository } from '../../../domain/users/UserRepository';
import type { UseCase } from '../../shared/UseCase';
import { toUserResponse, type UserResponse } from '../UserResponse';

export class ListUsersUseCase implements UseCase<void, UserResponse[]> {
    constructor(private readonly userRepository: UserRepository) {}

    public async execute(_input?: void): Promise<UserResponse[]> {
        const users: User[] = await this.userRepository.findAll();
        return users.map(toUserResponse);
    }
}
