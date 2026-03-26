import { InvalidArgumentError } from '../shared/InvalidArgumentError';
import { StringValueObject } from '../shared/StringValueObject';

export class UserName extends StringValueObject {
    constructor(value: string) {
        const normalizedValue: string = value.trim();

        super(normalizedValue);

        if (normalizedValue.length < 2) {
            throw new InvalidArgumentError('User name must contain at least 2 characters');
        }

        if (normalizedValue.length > 100) {
            throw new InvalidArgumentError('User name must contain at most 100 characters');
        }
    }
}
