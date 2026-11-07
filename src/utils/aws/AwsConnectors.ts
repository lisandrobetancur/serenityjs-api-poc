import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ECSClient } from '@aws-sdk/client-ecs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import {
    DynamoDbConnectionError,
    EcsConnectionError,
    LambdaConnectionError,
    S3ConnectionError,
    SecretRetrievalError,
} from '../../errors/IntegrationErrors';
import { EnvironmentConfig } from '../config/EnvironmentConfig';

/**
 * Lazy, one-per-process AWS SDK v3 clients. Region and optional endpoint (LocalStack) come from the environment
 * config; credentials come from the SDK's default provider chain. Creation failures are wrapped in the
 * integration's error. `closeAll()` runs at the end of the worker (AfterAll).
 */
// per-worker: one client per service and process, closed by closeAll() in AfterAll
const clients = new Map<string, { destroy(): void }>();

function lazy<T extends { destroy(): void }>(key: string, create: () => T, wrap: (cause: unknown) => Error): T {
    const existing = clients.get(key);
    if (existing) {
        return existing as T;
    }
    try {
        const client = create();
        clients.set(key, client);
        return client;
    } catch (cause) {
        throw wrap(cause);
    }
}

function clientConfig() {
    const { region, endpoint } = EnvironmentConfig.aws();
    return {
        region,
        ...(endpoint ? { endpoint } : {}),
        // LocalStack accepts any credentials; real environments use the default provider chain.
        ...(endpoint && !process.env.AWS_ACCESS_KEY_ID
            ? { credentials: { accessKeyId: 'test', secretAccessKey: 'test' } }
            : {}),
    };
}

export const AwsConnectors = {
    dynamo: () =>
        lazy(
            'dynamo',
            () => new DynamoDBClient(clientConfig()),
            cause => new DynamoDbConnectionError('Could not create the DynamoDB client', cause),
        ),

    dynamoDocuments: () =>
        lazy(
            'dynamoDocuments',
            () =>
                DynamoDBDocumentClient.from(AwsConnectors.dynamo(), {
                    marshallOptions: { removeUndefinedValues: true },
                }),
            cause => new DynamoDbConnectionError('Could not create the DynamoDB document client', cause),
        ),

    s3: () =>
        lazy(
            's3',
            () => new S3Client({ ...clientConfig(), forcePathStyle: Boolean(EnvironmentConfig.aws().endpoint) }),
            cause => new S3ConnectionError('Could not create the S3 client', cause),
        ),

    ecs: () =>
        lazy(
            'ecs',
            () => new ECSClient(clientConfig()),
            cause => new EcsConnectionError('Could not create the ECS client', cause),
        ),

    lambda: () =>
        lazy(
            'lambda',
            () => new LambdaClient(clientConfig()),
            cause => new LambdaConnectionError('Could not create the Lambda client', cause),
        ),

    secrets: () =>
        lazy(
            'secrets',
            () => new SecretsManagerClient(clientConfig()),
            cause => new SecretRetrievalError('Could not create the Secrets Manager client', cause),
        ),

    closeAll(): void {
        for (const client of clients.values()) {
            client.destroy();
        }
        clients.clear();
    },
};
