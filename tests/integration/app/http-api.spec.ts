import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { type ApplicationModules, createApplicationModules } from '../../../src/app/composition/createApplicationModules';
import { createApp } from '../../../src/app/createApp';
import { type AppContainer, createContainer } from '../../../src/app/createContainer';
import type { UserResponse } from '../../../src/application/users/UserResponse';
import type { HealthStatusPrimitives } from '../../../src/domain/system/HealthStatus';
import type { Environment } from '../../../src/infrastructure/config/env';
import { createHttpModules } from '../../../src/infrastructure/http/modules';

const testEnvironment: Environment = {
    APP_NAME: 'hexagonal-backend-template-ts',
    APP_VERSION: '1.0.0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    PORT: 3000
};

interface UsersListResponse {
    items: UserResponse[];
}

interface ErrorResponse {
    error: { code: string; message: string; };
}

function createTestApp(): Express {
    const container: AppContainer<ApplicationModules> = createContainer({ createModules: createApplicationModules, env: testEnvironment });

    return createApp({ container, createHttpModules });
}

describe('HTTP API', () => {
    it('exposes service metadata at the root endpoint', async () => {
        const app: Express = createTestApp();

        const response: request.Response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            endpoints: { health: '/health', users: '/api/v1/users' },
            environment: 'test',
            name: 'hexagonal-backend-template-ts',
            version: '1.0.0'
        });
    });

    it('creates, updates, lists, fetches and deletes users', async () => {
        const app: Express = createTestApp();

        const createResponse: request.Response = await request(app).post('/api/v1/users').send({
            email: 'alice@example.com',
            name: 'Alice'
        });
        const createdUser: UserResponse = createResponse.body as UserResponse;

        expect(createResponse.status).toBe(201);
        expect(createdUser.email).toBe('alice@example.com');

        const userId: string = createdUser.id;
        const updateResponse: request.Response = await request(app).put(`/api/v1/users/${userId}`).send({
            email: 'alice.smith@example.com',
            name: 'Alice Smith'
        });
        const updatedUser: UserResponse = updateResponse.body as UserResponse;

        expect(updateResponse.status).toBe(200);
        expect(updatedUser.email).toBe('alice.smith@example.com');
        expect(updatedUser.name).toBe('Alice Smith');

        const listResponse: request.Response = await request(app).get('/api/v1/users');
        const listedUsers: UsersListResponse = listResponse.body as UsersListResponse;

        expect(listResponse.status).toBe(200);
        expect(listedUsers.items).toHaveLength(1);
        expect(listedUsers.items[0]).toMatchObject({ email: 'alice.smith@example.com', id: userId, name: 'Alice Smith' });

        const getResponse: request.Response = await request(app).get(`/api/v1/users/${userId}`);
        const fetchedUser: UserResponse = getResponse.body as UserResponse;

        expect(getResponse.status).toBe(200);
        expect(fetchedUser.id).toBe(userId);
        expect(fetchedUser.updatedAt).toBe(updatedUser.updatedAt);

        const deleteResponse: request.Response = await request(app).delete(`/api/v1/users/${userId}`);

        expect(deleteResponse.status).toBe(204);

        const missingAfterDeleteResponse: request.Response = await request(app).get(`/api/v1/users/${userId}`);
        const missingAfterDeleteError: ErrorResponse = missingAfterDeleteResponse.body as ErrorResponse;

        expect(missingAfterDeleteResponse.status).toBe(404);
        expect(missingAfterDeleteError.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns validation and not found errors through the HTTP layer', async () => {
        const app: Express = createTestApp();
        const createdUserResponse: request.Response = await request(app).post('/api/v1/users').send({
            email: 'alice@example.com',
            name: 'Alice'
        });
        const createdUser: UserResponse = createdUserResponse.body as UserResponse;

        const invalidCreateResponse: request.Response = await request(app).post('/api/v1/users').send({ email: 'not-an-email', name: 'A' });
        const invalidCreateError: ErrorResponse = invalidCreateResponse.body as ErrorResponse;

        expect(invalidCreateResponse.status).toBe(400);
        expect(invalidCreateError.error.code).toBe('INVALID_REQUEST');

        const invalidUpdateResponse: request.Response = await request(app).put(`/api/v1/users/${createdUser.id}`).send({
            email: 'not-an-email',
            name: 'A'
        });
        const invalidUpdateError: ErrorResponse = invalidUpdateResponse.body as ErrorResponse;

        expect(invalidUpdateResponse.status).toBe(400);
        expect(invalidUpdateError.error.code).toBe('INVALID_REQUEST');

        const missingUserResponse: request.Response = await request(app).get('/api/v1/users/5f89458a-01cf-49ef-bd14-e238041bcd4b');
        const missingUserError: ErrorResponse = missingUserResponse.body as ErrorResponse;

        expect(missingUserResponse.status).toBe(404);
        expect(missingUserError.error.code).toBe('USER_NOT_FOUND');

        const invalidIdResponse: request.Response = await request(app).get('/api/v1/users/not-a-uuid');
        const invalidIdError: ErrorResponse = invalidIdResponse.body as ErrorResponse;

        expect(invalidIdResponse.status).toBe(400);
        expect(invalidIdError.error.code).toBe('INVALID_REQUEST');

        const conflictResponse: request.Response = await request(app).post('/api/v1/users').send({
            email: 'existing@example.com',
            name: 'Existing'
        });

        expect(conflictResponse.status).toBe(201);

        const duplicateEmailResponse: request.Response = await request(app).put(`/api/v1/users/${createdUser.id}`).send({
            email: 'existing@example.com',
            name: 'Alice'
        });
        const duplicateEmailError: ErrorResponse = duplicateEmailResponse.body as ErrorResponse;

        expect(duplicateEmailResponse.status).toBe(409);
        expect(duplicateEmailError.error.code).toBe('USER_ALREADY_EXISTS');

        const missingDeleteResponse: request.Response = await request(app).delete('/api/v1/users/5f89458a-01cf-49ef-bd14-e238041bcd4b');
        const missingDeleteError: ErrorResponse = missingDeleteResponse.body as ErrorResponse;

        expect(missingDeleteResponse.status).toBe(404);
        expect(missingDeleteError.error.code).toBe('USER_NOT_FOUND');
    });

    it('exposes the health endpoint', async () => {
        const app: Express = createTestApp();

        const response: request.Response = await request(app).get('/health');
        const health: HealthStatusPrimitives = response.body as HealthStatusPrimitives;

        expect(response.status).toBe(200);
        expect(health.status).toBe('ok');
        expect(health.name).toBe('hexagonal-backend-template-ts');
    });

    it('returns the default 404 payload for unknown routes', async () => {
        const app: Express = createTestApp();

        const response: request.Response = await request(app).get('/missing-route');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
    });
});
