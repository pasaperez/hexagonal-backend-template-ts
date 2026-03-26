import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../../application/shared/ports/IdGenerator';

export class NodeIdGenerator implements IdGenerator {
    public generate(): string {
        return randomUUID();
    }
}
