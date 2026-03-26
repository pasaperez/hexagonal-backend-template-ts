import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../src/domain/shared/DomainError';
import { Entity } from '../../../../src/domain/shared/Entity';
import { InvalidArgumentError } from '../../../../src/domain/shared/InvalidArgumentError';
import { StringValueObject } from '../../../../src/domain/shared/StringValueObject';
import { ValueObject } from '../../../../src/domain/shared/ValueObject';

class SampleDomainError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

class SampleStringId extends StringValueObject {
    constructor(value: string) {
        super(value);
    }
}

class SampleObjectValue extends ValueObject<{ id: string; }> {
    constructor(value: { id: string; }) {
        super(value);
    }
}

class PrimitiveEntity extends Entity<string> {
    constructor(id: string) {
        super(id);
    }
}

class ObjectIdEntity extends Entity<SampleStringId> {
    constructor(id: SampleStringId) {
        super(id);
    }
}

describe('Domain foundations', () => {
    it('builds domain errors with the right name', () => {
        const domainError: SampleDomainError = new SampleDomainError('Broken invariant');
        const invalidArgumentError: InvalidArgumentError = new InvalidArgumentError('Invalid argument');

        expect(domainError.name).toBe('SampleDomainError');
        expect(domainError.message).toBe('Broken invariant');
        expect(invalidArgumentError.name).toBe('InvalidArgumentError');
        expect(invalidArgumentError.message).toBe('Invalid argument');
    });

    it('compares value objects by deep equality', () => {
        const value: SampleObjectValue = new SampleObjectValue({ id: 'same' });

        expect(value.value).toEqual({ id: 'same' });
        expect(value.equals(new SampleObjectValue({ id: 'same' }))).toBe(true);
        expect(value.equals(new SampleObjectValue({ id: 'different' }))).toBe(false);
    });

    it('compares entities by primitive and value-object identifiers', () => {
        expect(new PrimitiveEntity('a').equals(new PrimitiveEntity('a'))).toBe(true);
        expect(new PrimitiveEntity('a').equals(new PrimitiveEntity('b'))).toBe(false);

        const sameId: SampleStringId = new SampleStringId('user-1');

        expect(new ObjectIdEntity(sameId).equals(new ObjectIdEntity(new SampleStringId('user-1')))).toBe(true);
        expect(new ObjectIdEntity(sameId).equals(new ObjectIdEntity(new SampleStringId('user-2')))).toBe(false);
    });
});
