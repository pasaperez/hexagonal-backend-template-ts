export abstract class Entity<Id> {
    protected constructor(public readonly id: Id) {}

    public equals(other: Entity<Id>): boolean {
        const currentId: unknown = this.id as unknown;
        if (
            typeof currentId === 'object'
            && currentId !== null
            && 'equals' in currentId
            && typeof (currentId as { equals: unknown; }).equals === 'function'
        ) {
            return (currentId as { equals: (value: unknown) => boolean; }).equals(other.id);
        }

        return currentId === other.id;
    }
}
