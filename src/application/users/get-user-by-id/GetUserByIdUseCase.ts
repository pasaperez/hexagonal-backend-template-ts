import type { User } from '../../../domain/users/User';
import { UserId } from '../../../domain/users/UserId';
import type { UserRepository } from '../../../domain/users/UserRepository';
import { NotFoundError } from '../../shared/ApplicationError';
import type { UseCase } from '../../shared/UseCase';
import { toUserResponse, type UserResponse } from '../UserResponse';
import type { GetUserByIdQuery } from './GetUserByIdQuery';

interface GetUserByIdDependencies {
    userRepository: UserRepository;
}

export class GetUserByIdUseCase implements UseCase<GetUserByIdQuery, UserResponse> {
    constructor(private readonly dependencies: GetUserByIdDependencies) {}

    public async execute(query: GetUserByIdQuery): Promise<UserResponse> {
        const user: User | null = await this.dependencies.userRepository.findById(new UserId(query.id));

        if (user === null) {
            throw new NotFoundError('User not found', 'USER_NOT_FOUND');
        }

        return toUserResponse(user);
    }
}
