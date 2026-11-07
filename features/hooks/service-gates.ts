import { ListTablesCommand } from '@aws-sdk/client-dynamodb';

import { AwsConnectors } from '../../src/utils/aws/AwsConnectors';
import { DatabaseClientProvider } from '../../src/utils/database/DatabaseClientProvider';
import { DatabaseNames, Databases } from '../../src/utils/database/DatabaseNames';
import { logger } from '../../src/utils/log/logger';

/**
 * Optional infrastructure (a database, LocalStack) is probed once per worker. Scenarios that need it are skipped
 * with a logged reason when it is not reachable, unless `REQUIRE_SERVICES=true` (CI), in which case they fail.
 */
// per-worker: each service is probed once per worker process
const probes = new Map<string, Promise<string | undefined>>();

export async function unavailableService(tag: '@database' | '@localstack'): Promise<string | undefined> {
    if (!probes.has(tag)) {
        probes.set(
            tag,
            (tag === '@database' ? probeDatabase() : probeLocalStack()).then(
                () => undefined,
                error => (error instanceof Error ? error.message : String(error)),
            ),
        );
    }
    const reason = await probes.get(tag)!;
    if (reason && process.env.REQUIRE_SERVICES === 'true') {
        throw new Error(`${tag} scenarios need a service that is not reachable: ${reason}`);
    }
    if (reason) {
        logger.info({ tag, reason }, 'Scenario skipped: service not reachable');
    }
    return reason;
}

async function probeDatabase(): Promise<void> {
    const client = await DatabaseClientProvider.clientFor(DatabaseNames.resolve(Databases.ORDERS));
    await client.query('SELECT 1 AS ok');
}

async function probeLocalStack(): Promise<void> {
    await AwsConnectors.dynamo().send(new ListTablesCommand({ Limit: 1 }), { abortSignal: AbortSignal.timeout(3000) });
}
