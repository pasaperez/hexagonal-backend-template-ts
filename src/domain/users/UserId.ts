import { InvalidArgumentError } from '../shared/InvalidArgumentError';
import { StringValueObject } from '../shared/StringValueObject';

const UUID_PATTERN: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UserId extends StringValueObject {
    constructor(value: string) {
        super(value);

        if (!UUID_PATTERN.test(value)) {
            throw new InvalidArgumentError('User id must be a valid UUID');
        }
    }
}
