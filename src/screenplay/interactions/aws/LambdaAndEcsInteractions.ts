import { DescribeTaskDefinitionCommand, RunTaskCommand } from '@aws-sdk/client-ecs';
import { InvokeCommand, TooManyRequestsException } from '@aws-sdk/client-lambda';
import { Interaction, TakeNotes } from '@serenity-js/core';

import { LambdaConnectionError, EcsConnectionError } from '../../../errors/IntegrationErrors';
import { EnvironmentConfig } from '../../../utils/config/EnvironmentConfig';
import { ReportEvidence } from '../../../utils/report/ReportEvidence';
import { WaitUtils } from '../../../utils/wait/WaitUtils';
import { InteractWithEcs, InteractWithLambda } from '../../abilities/aws/AwsAbilities';
import { abilityOf } from '../../abilities/aws/onDemand';
import { type Notes } from '../../notes/Notes';

const notesOf = (actor: Parameters<typeof TakeNotes.as>[0]) => TakeNotes.as<TakeNotes<Notes>>(actor).notepad;

/**
 * Invokes a Lambda and stores the status code, `FunctionError` and payload in the scene notes.
 * Lambda answers 200 even when the function throws, so the Step must assert `FunctionError` as well.
 */
export const InvokeLambda = {
    named: (functionName: string) => {
        const build = (payload: unknown, retry?: { maxAttempts: number; waitSeconds: number }) =>
            Interaction.where(`#actor invokes the Lambda ${functionName}`, async actor => {
                const client = abilityOf(actor, InteractWithLambda, () =>
                    InteractWithLambda.usingTheDefaultClient(),
                ).client;
                const body = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
                ReportEvidence.show(actor, `Invoke ${functionName}`, body);

                const maxAttempts = retry?.maxAttempts ?? 1;
                for (let attempt = 1; ; attempt++) {
                    try {
                        const result = await client.send(
                            new InvokeCommand({ FunctionName: functionName, Payload: new TextEncoder().encode(body) }),
                        );
                        const responsePayload = result.Payload ? new TextDecoder().decode(result.Payload) : '';
                        const notes = notesOf(actor);
                        notes.set('lambdaStatusCode', result.StatusCode ?? 0);
                        notes.set('lambdaPayload', responsePayload);
                        if (result.FunctionError) {
                            notes.set('lambdaFunctionError', `${result.FunctionError}: ${responsePayload}`);
                        } else {
                            notes.delete('lambdaFunctionError');
                        }
                        ReportEvidence.show(
                            actor,
                            `Response of ${functionName}`,
                            `StatusCode: ${result.StatusCode}\nFunctionError: ${result.FunctionError ?? 'none'}\n\n${responsePayload}`,
                        );
                        return;
                    } catch (error) {
                        // Reserved concurrency of 1: retried inside the interaction so the report shows no failure.
                        if (error instanceof TooManyRequestsException && attempt < maxAttempts) {
                            await WaitUtils.waitSeconds(retry!.waitSeconds, `Lambda ${functionName} is throttled`);
                            continue;
                        }
                        throw new LambdaConnectionError(`Could not invoke ${functionName}`, error);
                    }
                }
            });

        return {
            withPayload: (payload: unknown) => build(payload),
            withDefaultPayload: () => build({}),
            withPayloadRetryingWhenThrottled: (payload: unknown, maxAttempts: number, waitSeconds: number) =>
                build(payload, { maxAttempts, waitSeconds }),
            withDefaultPayloadRetryingWhenThrottled: (maxAttempts: number, waitSeconds: number) =>
                build({}, { maxAttempts, waitSeconds }),
        };
    },
};

/**
 * Runs a Fargate task in the environment's cluster with the network settings from config, and stores the
 * RunTask status code and the task ARN in the scene notes.
 */
export const RunFargateTask = {
    named: (taskDefinition: string) => {
        const options: { environment?: Record<string, string>; command?: string[] } = {};

        const interaction = () =>
            Interaction.where(`#actor runs the Fargate task ${taskDefinition}`, async actor => {
                const client = abilityOf(actor, InteractWithEcs, () => InteractWithEcs.usingTheDefaultClient()).client;
                const { ecsCluster, fargateNetwork } = EnvironmentConfig.aws();
                try {
                    const containerOverrides =
                        options.environment || options.command
                            ? [
                                  {
                                      name: await containerNameOf(client, taskDefinition),
                                      ...(options.environment
                                          ? {
                                                environment: Object.entries(options.environment).map(
                                                    ([name, value]) => ({ name, value }),
                                                ),
                                            }
                                          : {}),
                                      ...(options.command ? { command: options.command } : {}),
                                  },
                              ]
                            : undefined;

                    const result = await client.send(
                        new RunTaskCommand({
                            cluster: ecsCluster,
                            taskDefinition,
                            launchType: 'FARGATE',
                            networkConfiguration: { awsvpcConfiguration: fargateNetwork },
                            ...(containerOverrides ? { overrides: { containerOverrides } } : {}),
                        }),
                    );
                    const notes = notesOf(actor);
                    notes.set('fargateStatusCode', result.$metadata.httpStatusCode ?? 0);
                    notes.set('fargateTaskArn', result.tasks?.[0]?.taskArn ?? '');
                    ReportEvidence.show(
                        actor,
                        `RunTask ${taskDefinition}`,
                        `cluster: ${ecsCluster}\nstatus: ${result.$metadata.httpStatusCode}\ntask: ${result.tasks?.[0]?.taskArn ?? 'none'}\nfailures: ${JSON.stringify(result.failures ?? [])}`,
                    );
                } catch (error) {
                    throw new EcsConnectionError(`Could not run the Fargate task ${taskDefinition}`, error);
                }
            });

        const builder = {
            withEnvironment: (environment: Record<string, string>) => {
                options.environment = environment;
                return builder;
            },
            withCommand: (command: string[]) => {
                options.command = command;
                return builder;
            },
            run: interaction,
        };
        return builder;
    },
};

async function containerNameOf(client: InteractWithEcs['client'], taskDefinition: string): Promise<string> {
    const { taskDefinition: definition } = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition }));
    const name = definition?.containerDefinitions?.[0]?.name;
    if (!name) {
        throw new EcsConnectionError(`Task definition ${taskDefinition} has no container`);
    }
    return name;
}
