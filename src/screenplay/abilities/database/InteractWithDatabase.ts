import { Ability, type Actor } from '@serenity-js/core';

import { type DatabaseClient, type DatabaseTransaction } from '../../../utils/database/DatabaseClient';
import { DatabaseClientProvider } from '../../../utils/database/DatabaseClientProvider';
import { DatabaseNames } from '../../../utils/database/DatabaseNames';
import { QueryReport } from '../../../utils/report/QueryReport';

/**
 * Ability to read from and write to one relational database.
 *
 * The ability only handles the connection; tables, columns and statements belong to the Interactions and
 * Questions. The pool comes from `DatabaseClientProvider` (one per database for the whole run), so this ability
 * does not own it and has nothing to discard.
 *
 * An actor can hold one `InteractWithDatabase` at a time; `InteractWithDatabase.query(...)` switches it.
 */
export class InteractWithDatabase extends Ability {
    /**
     * Recommended entry point (the Java `InteractWithDatabase.query(db, entities, actor, fn)`): gives the actor
     * the ability for `databaseBaseName` and opens a report scope, so every statement of `fn` is published in one
     * "Query executed on database **name**" block with its result.
     */
    static async query<T>(
        actor: Actor,
        databaseBaseName: string,
        fn: (database: InteractWithDatabase) => Promise<T>,
    ): Promise<T> {
        const ability = InteractWithDatabase.using(databaseBaseName);
        const current = actor.hasAbilityTo(InteractWithDatabase) ? InteractWithDatabase.as(actor) : undefined;
        if (!current) {
            actor.whoCan(ability);
        }
        const database = current?.databaseName === ability.databaseName ? current : ability;
        return QueryReport.within(actor, database.databaseName, () => fn(database));
    }

    /** `databaseBaseName` is resolved with the environment prefix (`orders` → `qa_orders`). */
    static using(databaseBaseName: string): InteractWithDatabase {
        return new InteractWithDatabase(DatabaseNames.resolve(databaseBaseName));
    }

    constructor(public readonly databaseName: string) {
        super();
    }

    /** A read outside of a transaction. */
    async read<T>(fn: (client: DatabaseClient) => Promise<T>): Promise<T> {
        return fn(await DatabaseClientProvider.clientFor(this.databaseName));
    }

    /** Writes in one transaction (with `lock_timeout` on PostgreSQL). */
    async inTransaction<T>(fn: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
        return (await DatabaseClientProvider.clientFor(this.databaseName)).transaction(fn);
    }
}
