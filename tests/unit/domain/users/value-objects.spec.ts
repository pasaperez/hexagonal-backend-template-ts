import { describe, expect, it } from 'vitest';
import { InvalidArgumentError } from '../../../../src/domain/shared/InvalidArgumentError';
import { UserEmail } from '../../../../src/domain/users/UserEmail';
import { UserId } from '../../../../src/domain/users/UserId';
import { UserName } from '../../../../src/domain/users/UserName';

describe('User value objects', () => {
    it('normalizes valid user names and emails', () => {
        expect(new UserName('  Jane Doe  ').value).toBe('Jane Doe');
        expect(new UserEmail('  JANE.DOE@EXAMPLE.COM  ').value).toBe('jane.doe@example.com');
        expect(new UserId('5f89458a-01cf-49ef-bd14-e238041bcd4b').value).toBe('5f89458a-01cf-49ef-bd14-e238041bcd4b');
    });

    it('rejects invalid user names', () => {
        expect(() => new UserName('A')).toThrowError(new InvalidArgumentError('User name must contain at least 2 characters'));
        expect(() => new UserName('a'.repeat(101))).toThrowError(new InvalidArgumentError('User name must contain at most 100 characters'));
    });

    it('rejects invalid user emails and identifiers', () => {
        expect(() => new UserEmail('invalid-email')).toThrowError(new InvalidArgumentError('User email must be valid'));
        expect(() => new UserId('not-a-uuid')).toThrowError(new InvalidArgumentError('User id must be a valid UUID'));
    });
});
