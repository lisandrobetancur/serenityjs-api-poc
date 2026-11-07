import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Interaction } from '@serenity-js/core';

import { ReportEvidence } from '../../../utils/report/ReportEvidence';
import { InteractWithDynamo } from '../../abilities/aws/AwsAbilities';
import { abilityOf } from '../../abilities/aws/onDemand';

const dynamo = (actor: Parameters<typeof abilityOf>[0]) =>
    abilityOf(actor, InteractWithDynamo, () => InteractWithDynamo.withPrimaryKey());

/**
 * Dynamo writes, as step builders: each step only offers the next method, so a half-built write cannot compile.
 */
export const SaveDynamoItem = {
    intoTable: (table: string) => ({
        withAttributes: (attributes: Record<string, unknown>) =>
            Interaction.where(`#actor saves an item into Dynamo table ${table}`, async actor => {
                const item = dynamo(actor).toAttributeMap(attributes);
                ReportEvidence.show(actor, `PutItem ${table}`, JSON.stringify(item, null, 2));
                await dynamo(actor).documents.send(new PutCommand({ TableName: table, Item: item }));
            }),
    }),
};

export const UpdateDynamoItem = {
    inTable: (table: string) => ({
        withKey: (key: string) => ({
            field: (field: string) => ({
                to: (value: unknown) =>
                    Interaction.where(`#actor sets ${field} of item ${key} in Dynamo table ${table}`, async actor => {
                        const ability = dynamo(actor);
                        ReportEvidence.show(
                            actor,
                            `UpdateItem ${table}`,
                            `${ability.primaryKey} = ${key}\nSET ${field} = ${JSON.stringify(value)}`,
                        );
                        await ability.documents.send(
                            new UpdateCommand({
                                TableName: table,
                                Key: ability.keyOf(key),
                                UpdateExpression: 'SET #field = :value',
                                ExpressionAttributeNames: { '#field': field },
                                ExpressionAttributeValues: { ':value': value },
                            }),
                        );
                    }),
            }),
        }),
    }),
};

export const DeleteDynamoItem = {
    fromTable: (table: string) => ({
        withKey: (key: string) =>
            Interaction.where(`#actor deletes item ${key} from Dynamo table ${table}`, async actor => {
                const ability = dynamo(actor);
                ReportEvidence.show(actor, `DeleteItem ${table}`, `${ability.primaryKey} = ${key}`);
                await ability.documents.send(new DeleteCommand({ TableName: table, Key: ability.keyOf(key) }));
            }),
    }),
};

/**
 * Sets a **numeric** `ttl` in the past without touching the other attributes, so readers that need the rest of
 * the item still find it. Preferable to deleting; a `ttl` written as a string breaks readers that expect a number.
 */
export const ExpireDynamoItem = {
    inTable: (table: string, ttlAttribute = 'ttl') => ({
        withKey: (key: string) =>
            Interaction.where(`#actor expires item ${key} in Dynamo table ${table}`, async actor => {
                const ability = dynamo(actor);
                const expiredAt = Math.floor(Date.now() / 1000) - 60;
                ReportEvidence.show(
                    actor,
                    `UpdateItem ${table}`,
                    `${ability.primaryKey} = ${key}\nSET ${ttlAttribute} = ${expiredAt} (number)`,
                );
                await ability.documents.send(
                    new UpdateCommand({
                        TableName: table,
                        Key: ability.keyOf(key),
                        UpdateExpression: 'SET #ttl = :expiredAt',
                        ExpressionAttributeNames: { '#ttl': ttlAttribute },
                        ExpressionAttributeValues: { ':expiredAt': expiredAt },
                    }),
                );
            }),
    }),
};
