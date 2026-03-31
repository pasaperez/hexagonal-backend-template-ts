import { describe, expect, it } from 'vitest';
import { buildEndpointCatalog, type HttpModule, joinHttpPaths, matchHttpPath, normalizeHttpPath, resolveHttpRoute } from '../../../../src/infrastructure/http/HttpModule';

describe('HttpModule', () => {
    it('builds endpoint catalogs and joins normalized paths', () => {
        const modules: HttpModule[] = [{ basePath: '/health/', key: 'health', routes: [] }, {
            basePath: 'api/v1/users',
            key: 'users',
            routes: []
        }];

        expect(buildEndpointCatalog(modules)).toEqual({ health: '/health/', users: 'api/v1/users' });
        expect(normalizeHttpPath('')).toBe('/');
        expect(normalizeHttpPath('/api/v1/users/')).toBe('/api/v1/users');
        expect(joinHttpPaths('/', '/health')).toBe('/health');
        expect(joinHttpPaths('/api/v1/users/', '/')).toBe('/api/v1/users');
        expect(joinHttpPaths('/api/v1/users', ':id')).toBe('/api/v1/users/:id');
    });

    it('matches parameterized paths and resolves routes by method', () => {
        const modules: HttpModule[] = [{
            basePath: '/api/v1/users',
            key: 'users',
            routes: [{ handler: () => Promise.resolve({ statusCode: 200 }), method: 'GET', path: '/' }, {
                handler: () => Promise.resolve({ statusCode: 200 }),
                method: 'GET',
                path: '/:id'
            }, { handler: () => Promise.resolve({ statusCode: 204 }), method: 'DELETE', path: '/:id' }]
        }];

        expect(matchHttpPath('/api/v1/users/:id', '/api/v1/users/user%201')).toEqual({ id: 'user 1' });
        expect(matchHttpPath('/api/v1/users/:id', '/api/v1/users')).toBeNull();
        expect(resolveHttpRoute(modules, 'GET', '/api/v1/users/123')?.params).toEqual({ id: '123' });
        expect(resolveHttpRoute(modules, 'DELETE', '/api/v1/users/123')?.route.method).toBe('DELETE');
        expect(resolveHttpRoute(modules, 'POST', '/api/v1/users/123')).toBeNull();
    });
});
