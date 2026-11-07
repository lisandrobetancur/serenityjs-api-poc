/**
 * One error per integration, thrown by the connectors and the secret reader. Each keeps the SDK error as `cause`.
 */
abstract class IntegrationError extends Error {
    protected constructor(name: string, message: string, cause?: unknown) {
        super(cause === undefined ? message : `${message}: ${cause instanceof Error ? cause.message : String(cause)}`, {
            cause,
        });
        this.name = name;
    }
}

export class DynamoDbConnectionError extends IntegrationError {
    constructor(message: string, cause?: unknown) {
        super('DynamoDbConnectionError', message, cause);
    }
}

export class S3ConnectionError extends IntegrationError {
    constructor(message: string, cause?: unknown) {
        super('S3ConnectionError', message, cause);
    }
}

export class EcsConnectionError extends IntegrationError {
    constructor(message: string, cause?: unknown) {
        super('EcsConnectionError', message, cause);
    }
}

export class LambdaConnectionError extends IntegrationError {
    constructor(message: string, cause?: unknown) {
        super('LambdaConnectionError', message, cause);
    }
}

export class SecretRetrievalError extends IntegrationError {
    constructor(message: string, cause?: unknown) {
        super('SecretRetrievalError', message, cause);
    }
}
