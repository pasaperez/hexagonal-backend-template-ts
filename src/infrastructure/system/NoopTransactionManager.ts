import type { TransactionManager } from '../../application/shared/ports/TransactionManager';

export class NoopTransactionManager implements TransactionManager {
    public async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
        return operation();
    }
}
