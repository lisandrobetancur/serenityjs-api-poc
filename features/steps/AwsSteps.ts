import { Ensure, equals, isPresent, isTrue, not } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import { DeleteFileFromS3, UploadFileToS3 } from '../../src/screenplay/interactions/aws/S3Interactions';
import { ExpireDynamoItem, SaveDynamoItem } from '../../src/screenplay/interactions/aws/DynamoInteractions';
import { InvokeLambda, RunFargateTask } from '../../src/screenplay/interactions/aws/LambdaAndEcsInteractions';
import {
    type FargateTaskState,
    GetDynamoItem,
    S3ObjectExists,
    TheFargateStatusCode,
    TheFargateTask,
    TheLambdaFunctionError,
    TheLambdaStatusCode,
} from '../../src/screenplay/questions/aws/AwsQuestions';
import { TheNote } from '../../src/screenplay/questions/notes/TheNote';
import { CronLaunchGate } from '../../src/utils/aws/cron/CronLaunchGate';
import { type CronDefinition } from '../../src/utils/aws/cron/CronLocks';
import { WaitUtils } from '../../src/utils/wait/WaitUtils';
import { step } from './step';

/**
 * Generic AWS steps, ready to reuse in any project. Each one performs one action and asserts its outcome.
 */
export const AwsSteps = {
    /** Lambda answers 200 even when the function throws, so `FunctionError` is asserted too. */
    invokeLambda: (
        actor: Actor,
        functionName: string,
        payload?: unknown,
        retryWhenThrottled?: { maxAttempts: number; waitSeconds: number },
    ) => {
        const lambda = InvokeLambda.named(functionName);
        const invocation = retryWhenThrottled
            ? lambda.withPayloadRetryingWhenThrottled(
                  payload ?? {},
                  retryWhenThrottled.maxAttempts,
                  retryWhenThrottled.waitSeconds,
              )
            : payload === undefined
              ? lambda.withDefaultPayload()
              : lambda.withPayload(payload);
        return step(
            actor,
            `#actor invokes the Lambda ${functionName}`,
            invocation,
            Ensure.that(TheLambdaStatusCode.was().describedAs('StatusCode:'), equals(200)),
            Ensure.that(
                TheLambdaFunctionError.was().describedAs('FunctionError:'),
                equals<string | undefined>(undefined),
            ),
        );
    },

    /** The same invocation where the function is expected to fail: status 200 and a FunctionError. */
    invokeLambdaExpectingFailure: (actor: Actor, functionName: string, payload: unknown) =>
        step(
            actor,
            `#actor invokes the Lambda ${functionName} and sees it fail`,
            InvokeLambda.named(functionName).withPayload(payload),
            Ensure.that(TheLambdaStatusCode.was().describedAs('StatusCode:'), equals(200)),
            Ensure.that(TheLambdaFunctionError.was().describedAs('FunctionError:'), isPresent()),
        ),

    /** Runs a Fargate task and polls until it stops; asserts it stopped with exit code 0. */
    runFargateTaskToCompletion: (actor: Actor, taskDefinition: string, maxMinutes = 15) =>
        step(
            actor,
            `#actor runs the Fargate task ${taskDefinition} to completion`,
            RunFargateTask.named(taskDefinition).run(),
            Ensure.that(TheFargateStatusCode.was().describedAs('RunTask status:'), equals(200)),
            Ensure.that(
                WaitUtils.pollUntil<FargateTaskState>(
                    `the Fargate task ${taskDefinition}`,
                    async pollingActor =>
                        pollingActor.answer(
                            TheFargateTask.withArn(await pollingActor.answer(TheNote.called('fargateTaskArn'))),
                        ),
                    task => task.lastStatus === 'STOPPED',
                    15,
                    Math.ceil((maxMinutes * 60) / 15),
                ).describedAs('task:'),
                equals<FargateTaskState>({
                    lastStatus: 'STOPPED',
                    exitCode: 0,
                    stoppedReason: 'Essential container in task exited',
                }),
            ),
        ),

    /** Makes sure the cron can be launched (enabled, lock free) and launches it with the given Lambda. */
    launchCron: (actor: Actor, cron: CronDefinition, functionName: string) =>
        step(
            actor,
            `#actor launches the cron ${cron.handler}`,
            CronLaunchGate.launch(
                cron,
                InvokeLambda.named(functionName).withDefaultPayloadRetryingWhenThrottled(5, 10),
            ),
            Ensure.that(TheLambdaStatusCode.was().describedAs('StatusCode:'), equals(200)),
        ),

    saveConfigItem: (actor: Actor, table: string, key: string, value: string) =>
        step(
            actor,
            `#actor saves ${key} = ${value} in Dynamo table ${table}`,
            SaveDynamoItem.intoTable(table).withAttributes({
                Id: key,
                value,
                ttl: Math.floor(Date.now() / 1000) + 3600,
            }),
            Ensure.that(
                GetDynamoItem.fromTable(table)
                    .byKey(key)
                    .as(item => item.value)
                    .describedAs(`${key}:`),
                equals(value),
            ),
        ),

    configItemIs: (actor: Actor, table: string, key: string, value: string) =>
        step(
            actor,
            `#actor sees ${key} = ${value} in Dynamo table ${table}`,
            Ensure.that(
                GetDynamoItem.fromTable(table)
                    .byKey(key)
                    .as(item => item.value)
                    .describedAs(`${key}:`),
                equals(value),
            ),
        ),

    /** Expire + re-read: the ttl must be a number in the past and the other attributes must still be there. */
    expireConfigItem: (actor: Actor, table: string, key: string) =>
        step(
            actor,
            `#actor expires ${key} in Dynamo table ${table}`,
            ExpireDynamoItem.inTable(table).withKey(key),
            Ensure.that(
                GetDynamoItem.fromTable(table)
                    .rawByKey(key)
                    .as(item => typeof item?.ttl === 'number' && item.ttl < Date.now() / 1000)
                    .describedAs('ttl is a past number:'),
                isTrue(),
            ),
            Ensure.that(
                GetDynamoItem.fromTable(table)
                    .byKey(key)
                    .as(item => item.value)
                    .describedAs('value still present:'),
                not(equals<string | undefined>(undefined)),
            ),
        ),

    uploadCsvFromTemplate: (actor: Actor, bucket: string, key: string, rows: Array<Record<string, string | number>>) =>
        step(
            actor,
            `#actor uploads a CSV built from the template to s3://${bucket}/${key}`,
            UploadFileToS3.fromCsvTemplate('test-data/templates/orders-template.csv', rows)
                .toBucket(bucket)
                .withKey(key),
            Ensure.that(
                S3ObjectExists.inBucket(bucket).withKey(key).describedAs(`s3://${bucket}/${key} exists:`),
                isTrue(),
            ),
        ),

    uploadExcelFromTemplate: (
        actor: Actor,
        bucket: string,
        key: string,
        rows: Array<Record<string, string | number>>,
    ) =>
        step(
            actor,
            `#actor uploads an Excel file built from the template to s3://${bucket}/${key}`,
            UploadFileToS3.fromExcelTemplate('test-data/templates/orders-template.xlsx', rows)
                .toBucket(bucket)
                .withKey(key),
            Ensure.that(
                S3ObjectExists.inBucket(bucket).withKey(key).describedAs(`s3://${bucket}/${key} exists:`),
                isTrue(),
            ),
        ),

    deleteFile: (actor: Actor, bucket: string, key: string) =>
        step(
            actor,
            `#actor deletes s3://${bucket}/${key}`,
            DeleteFileFromS3.fromBucket(bucket).withKey(key),
            Ensure.that(
                S3ObjectExists.inBucket(bucket).withKey(key).describedAs(`s3://${bucket}/${key} exists:`),
                equals(false),
            ),
        ),
};
