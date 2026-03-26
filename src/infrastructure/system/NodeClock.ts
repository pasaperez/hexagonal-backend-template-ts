import type { Clock } from '../../application/shared/ports/Clock';

export class NodeClock implements Clock {
    public now(): Date {
        return new Date();
    }
}
