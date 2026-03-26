import { isDeepStrictEqual } from 'node:util';

export abstract class ValueObject<T> {
    protected constructor(private readonly innerValue: Readonly<T>) {}

    public get value(): T {
        return this.innerValue;
    }

    public equals(other: ValueObject<T>): boolean {
        return isDeepStrictEqual(this.innerValue, other.innerValue);
    }
}
