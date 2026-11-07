import { DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { GetObjectCommand, HeadObjectCommand, NotFound } from '@aws-sdk/client-s3';
import { GetCommand, ScanCommand, type ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { Question, type QuestionAdapter } from '@serenity-js/core';

import { EnvironmentConfig } from '../../../utils/config/EnvironmentConfig';
import { InteractWithDynamo, InteractWithEcs, InteractWithS3 } from '../../abilities/aws/AwsAbilities';
import { abilityOf } from '../../abilities/aws/onDemand';
import { TheNote } from '../notes/TheNote';

const dynamo = (actor: Parameters<typeof abilityOf>[0]) =>
    abilityOf(actor, InteractWithDynamo, () => InteractWithDynamo.withPrimaryKey());

// Dynamo --------------------------------------------------------------------------------------------------------------

export const GetDynamoItem = {
    fromTable: (table: string) => ({
        /** String attributes of the item, or an empty map when it does not exist. */
        byKey: (key: string): QuestionAdapter<Record<string, string>> =>
            Question.about(`the item ${key} of Dynamo table ${table}`, async actor => {
                const ability = dynamo(actor);
                const { Item } = await ability.documents.send(
                    new GetCommand({ TableName: table, Key: ability.keyOf(key) }),
                );
                return ability.toStringMap(Item);
            }),

        /** All attributes, numbers included (used for `ttl`). */
        rawByKey: (key: string): QuestionAdapter<Record<string, unknown> | undefined> =>
            Question.about(`the raw item ${key} of Dynamo table ${table}`, async actor => {
                const ability = dynamo(actor);
                return (await ability.documents.send(new GetCommand({ TableName: table, Key: ability.keyOf(key) })))
                    .Item;
            }),
    }),
};

export const GetDynamoItems = {
    fromTable: (table: string) => ({
        /**
         * Paginated scan with a filter; only string attributes are kept (other types are omitted, not read as null).
         * A scan reads the whole table: only use it on small tables.
         */
        where: (attribute: string, value: string): QuestionAdapter<Array<Record<string, string>>> =>
            Question.about(`the items of Dynamo table ${table} where ${attribute} = ${value}`, async actor => {
                const ability = dynamo(actor);
                const items: Array<Record<string, string>> = [];
                let startKey: ScanCommandOutput['LastEvaluatedKey'];
                do {
                    const page: ScanCommandOutput = await ability.documents.send(
                        new ScanCommand({
                            TableName: table,
                            FilterExpression: '#attribute = :value',
                            ExpressionAttributeNames: { '#attribute': attribute },
                            ExpressionAttributeValues: { ':value': value },
                            ExclusiveStartKey: startKey,
                        }),
                    );
                    items.push(...(page.Items ?? []).map(item => ability.toStringMap(item)));
                    startKey = page.LastEvaluatedKey;
                } while (startKey);
                return items;
            }),
    }),
};

export interface TimeLock {
    lockedTilEnd: boolean;
    ttlEpochSeconds: number | undefined;
    isHeld(): boolean;
    secondsLeft(): number;
}

/**
 * A lock row written by the backend (cron locks): `lockedTilEnd` (string "true"/"false") and a **numeric** `ttl`.
 * Field names are configurable.
 */
export const GetTimeLock = {
    withKey: (
        key: string,
        fields = { lockedTilEnd: 'lockedTilEnd', ttl: 'ttl' },
        table = `${EnvironmentConfig.cron().lockTable}_${EnvironmentConfig.getEnvironment()}`,
    ): QuestionAdapter<TimeLock> =>
        Question.about(`the lock ${key}`, async actor => {
            const item = await actor.answer(GetDynamoItem.fromTable(table).rawByKey(key));
            const ttl = typeof item?.[fields.ttl] === 'number' ? (item[fields.ttl] as number) : undefined;
            const lockedTilEnd = String(item?.[fields.lockedTilEnd] ?? 'false').toLowerCase() === 'true';
            const secondsLeft = () => (ttl === undefined ? 0 : Math.max(0, ttl - Math.floor(Date.now() / 1000)));
            return { lockedTilEnd, ttlEpochSeconds: ttl, isHeld: () => secondsLeft() > 0, secondsLeft };
        }),
};

/**
 * The first key whose execution is disabled in a table of "switches" (`value` = "true"), or `undefined`.
 */
export const GetDisablingKey = {
    forKeys: (
        keys: string[],
        table = `${EnvironmentConfig.cron().disablingTable}_${EnvironmentConfig.getEnvironment()}`,
        valueField = 'value',
    ): QuestionAdapter<string | undefined> =>
        Question.about(`the first disabled key among ${keys.join(', ')}`, async actor => {
            for (const key of keys) {
                const item = await actor.answer(GetDynamoItem.fromTable(table).byKey(key));
                if ((item[valueField] ?? '').toLowerCase() === 'true') {
                    return key;
                }
            }
            return undefined;
        }),
};

// ECS -----------------------------------------------------------------------------------------------------------------

export const TheFargateStatusCode = {
    was: () => TheNote.called('fargateStatusCode').describedAs('the RunTask status code'),
};

export interface FargateTaskState {
    lastStatus: string | undefined;
    exitCode: number | undefined;
    stoppedReason: string | undefined;
}

export const TheFargateTask = {
    /** One read of the task; whoever waits for it polls (`WaitUtils.pollUntil`). */
    withArn: (taskArn: string): QuestionAdapter<FargateTaskState> =>
        Question.about(`the Fargate task ${taskArn}`, async actor => {
            const client = abilityOf(actor, InteractWithEcs, () => InteractWithEcs.usingTheDefaultClient()).client;
            const { tasks } = await client.send(
                new DescribeTasksCommand({ cluster: EnvironmentConfig.aws().ecsCluster, tasks: [taskArn] }),
            );
            const task = tasks?.[0];
            return {
                lastStatus: task?.lastStatus,
                exitCode: task?.containers?.[0]?.exitCode,
                stoppedReason: task?.stoppedReason,
            };
        }),
};

// Lambda --------------------------------------------------------------------------------------------------------------

export const TheLambdaStatusCode = {
    was: () => TheNote.called('lambdaStatusCode').describedAs('the Lambda status code'),
};

export const TheLambdaFunctionError = {
    /** `undefined` when the function did not throw. */
    was: () =>
        Question.about<string | undefined>('the Lambda function error', async actor =>
            (await actor.answer(TheNote.isPresent('lambdaFunctionError')))
                ? actor.answer(TheNote.called('lambdaFunctionError'))
                : undefined,
        ),
};

// S3 ------------------------------------------------------------------------------------------------------------------

const s3 = (actor: Parameters<typeof abilityOf>[0]) =>
    abilityOf(actor, InteractWithS3, () => InteractWithS3.usingTheDefaultClient()).client;

export const GetS3FileContent = {
    fromBucket: (bucket: string) => ({
        withKey: (key: string): QuestionAdapter<Uint8Array> =>
            Question.about<Uint8Array>(`the content of s3://${bucket}/${key}`, async actor => {
                const { Body } = await s3(actor).send(new GetObjectCommand({ Bucket: bucket, Key: key }));
                return Body!.transformToByteArray();
            }),
    }),
};

export const S3ObjectExists = {
    inBucket: (bucket: string) => ({
        withKey: (key: string): QuestionAdapter<boolean> =>
            Question.about(`whether s3://${bucket}/${key} exists`, async actor => {
                try {
                    await s3(actor).send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
                    return true;
                } catch (error) {
                    if (error instanceof NotFound || (error as { name?: string }).name === 'NotFound') {
                        return false;
                    }
                    throw error;
                }
            }),
    }),
};
