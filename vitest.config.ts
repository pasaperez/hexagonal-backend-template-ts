import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.spec.ts'],
        coverage: {
            all: true,
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/app/modules/SharedModuleDependencies.ts',
                'src/application/shared/UseCase.ts',
                'src/application/shared/ports/*.ts',
                'src/application/users/create-user/CreateUserCommand.ts',
                'src/application/users/get-user-by-id/GetUserByIdQuery.ts',
                'src/domain/shared/DomainEvent.ts',
                'src/domain/users/UserRepository.ts'
            ],
            thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 }
        }
    }
});
