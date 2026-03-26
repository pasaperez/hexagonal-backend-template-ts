import { describe, expect, it } from 'vitest';
import { InvalidArgumentError } from '../../../../src/domain/shared/InvalidArgumentError';
import { HealthStatus } from '../../../../src/domain/system/HealthStatus';

describe('HealthStatus', () => {
    it('serializes a valid status payload', () => {
        const healthStatus: HealthStatus = new HealthStatus({
            environment: 'test',
            name: 'hexagonal-backend-template-ts',
            timestamp: new Date('2026-01-01T10:00:00.000Z'),
            uptimeSeconds: 10.236,
            version: '1.0.0'
        });

        expect(healthStatus.toPrimitives()).toEqual({
            environment: 'test',
            name: 'hexagonal-backend-template-ts',
            status: 'ok',
            timestamp: '2026-01-01T10:00:00.000Z',
            uptimeSeconds: 10.24,
            version: '1.0.0'
        });
    });

    it('rejects an empty name', () => {
        expect(() =>
            new HealthStatus({
                environment: 'test',
                name: '   ',
                timestamp: new Date('2026-01-01T10:00:00.000Z'),
                uptimeSeconds: 1,
                version: '1.0.0'
            })
        ).toThrowError(new InvalidArgumentError('Health service name cannot be empty'));
    });

    it('rejects an empty version', () => {
        expect(() =>
            new HealthStatus({
                environment: 'test',
                name: 'hexagonal-backend-template-ts',
                timestamp: new Date('2026-01-01T10:00:00.000Z'),
                uptimeSeconds: 1,
                version: '   '
            })
        ).toThrowError(new InvalidArgumentError('Health version cannot be empty'));
    });

    it('rejects negative and non-finite uptimes', () => {
        expect(() =>
            new HealthStatus({
                environment: 'test',
                name: 'hexagonal-backend-template-ts',
                timestamp: new Date('2026-01-01T10:00:00.000Z'),
                uptimeSeconds: -1,
                version: '1.0.0'
            })
        ).toThrowError(new InvalidArgumentError('Health uptime must be a positive finite number'));

        expect(() =>
            new HealthStatus({
                environment: 'test',
                name: 'hexagonal-backend-template-ts',
                timestamp: new Date('2026-01-01T10:00:00.000Z'),
                uptimeSeconds: Number.NaN,
                version: '1.0.0'
            })
        ).toThrowError(new InvalidArgumentError('Health uptime must be a positive finite number'));
    });
});
