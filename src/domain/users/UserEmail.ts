import { InvalidArgumentError } from '../shared/InvalidArgumentError';
import { StringValueObject } from '../shared/StringValueObject';

const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserEmail extends StringValueObject {
    constructor(value: string) {
        const normalizedValue: string = value.trim().toLowerCase();

        super(normalizedValue);

        if (!EMAIL_PATTERN.test(normalizedValue)) {
            throw new InvalidArgumentError('User email must be valid');
        }
    }
}
