import type { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { ECSClient } from '@aws-sdk/client-ecs';
import type { LambdaClient } from '@aws-sdk/client-lambda';
import type { S3Client } from '@aws-sdk/client-s3';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Ability } from '@serenity-js/core';

import { AwsConnectors } from '../../../utils/aws/AwsConnectors';

/**
 * AWS abilities only expose a client; tables, keys, buckets, functions and task definitions belong to each
 * Interaction or Question. Clients are process-wide singletons from `AwsConnectors`, so abilities discard nothing.
 */
export class InteractWithDynamo extends Ability {
    /** By convention the primary key attribute is `Id`; pass another name when a table differs. */
    static withPrimaryKey(primaryKey = 'Id'): InteractWithDynamo {
        return new InteractWithDynamo(primaryKey);
    }

    constructor(public readonly primaryKey: string) {
        super();
    }

    get client(): DynamoDBClient {
        return AwsConnectors.dynamo();
    }

    get documents(): DynamoDBDocumentClient {
        return AwsConnectors.dynamoDocuments();
    }

    keyOf(value: string): Record<string, string> {
        return { [this.primaryKey]: value };
    }

    /** Drops `null` and `undefined` attributes, which Dynamo would otherwise store as NULL. */
    toAttributeMap(record: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null && value !== undefined));
    }

    /** Keeps only string attributes of a low-level item, as plain strings. */
    toStringMap(item: Record<string, AttributeValue> | Record<string, unknown> | undefined): Record<string, string> {
        if (!item) {
            return {};
        }
        return Object.fromEntries(
            Object.entries(item).flatMap(([key, value]) => {
                if (typeof value === 'string') {
                    return [[key, value]];
                }
                const attribute = value as AttributeValue;
                return 'S' in attribute && typeof attribute.S === 'string' ? [[key, attribute.S]] : [];
            }),
        );
    }
}

export class InteractWithEcs extends Ability {
    static usingTheDefaultClient(): InteractWithEcs {
        return new InteractWithEcs();
    }

    get client(): ECSClient {
        return AwsConnectors.ecs();
    }
}

export class InteractWithLambda extends Ability {
    static usingTheDefaultClient(): InteractWithLambda {
        return new InteractWithLambda();
    }

    get client(): LambdaClient {
        return AwsConnectors.lambda();
    }
}

export class InteractWithS3 extends Ability {
    static usingTheDefaultClient(): InteractWithS3 {
        return new InteractWithS3();
    }

    get client(): S3Client {
        return AwsConnectors.s3();
    }
}
