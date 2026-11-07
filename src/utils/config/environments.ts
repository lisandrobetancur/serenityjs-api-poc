/**
 * Per-environment configuration, the TypeScript counterpart of `serenity.conf` (HOCON) in the Java suite.
 *
 * `default` is used by `qa` and by any environment that has no block of its own.
 * Blocks only need the values that differ from `default`; they are deep-merged over it.
 */
export interface EnvironmentSettings {
    /** Base URL of the API under test. */
    apiBaseUrl: string;
    /** Name of the Secrets Manager secret that holds the database credentials. */
    databaseSecret: string;
    /** Database port; the host comes from the secret. */
    databasePort: number;
    aws: {
        region: string;
        /** Optional endpoint override, e.g. LocalStack. */
        endpoint?: string;
        /** ECS cluster where Fargate tasks run (one per environment, never a parameter). */
        ecsCluster: string;
        fargateNetwork: {
            subnets: string[];
            securityGroups: string[];
            assignPublicIp: 'ENABLED' | 'DISABLED';
        };
    };
    http: {
        connectTimeoutSeconds: number;
        idleTimeoutSeconds: number;
        /** Wait between 502 / 504 retries. */
        gatewayRetryWaitSeconds: number;
        gatewayRetries: number;
        /** Base silence after an edge 403, multiplied by the attempt number. */
        edgeRetrySilenceSeconds: number;
        edgeRetries: number;
        /** Response header that identifies an edge rejection and the value it contains. */
        edgeErrorHeader: { name: string; contains: string };
        /** Resources rate-limited at the edge: at most `calls` per `perSeconds` (sliding window). */
        throttledResources: Array<{ resource: string; calls: number; perSeconds: number }>;
    };
    cron: {
        lockTable: string;
        disablingTable: string;
        lockKeyPrefix: string;
        lockPollSeconds: number;
        lockMaxWaitSeconds: number;
        settleSeconds: number;
    };
    /** Free-form values a project can read with `EnvironmentConfig.custom(path)`. */
    custom: Record<string, unknown>;
}

type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K];
};

export const environments: { default: EnvironmentSettings } & Record<string, DeepPartial<EnvironmentSettings>> = {
    default: {
        apiBaseUrl: 'http://localhost:8000',
        databaseSecret: 'acme/db/qa',
        databasePort: 5432,
        aws: {
            region: 'us-east-1',
            ecsCluster: 'acme-cluster-qa',
            fargateNetwork: {
                subnets: ['subnet-00000000000000000'],
                securityGroups: ['sg-00000000000000000'],
                assignPublicIp: 'DISABLED',
            },
        },
        http: {
            connectTimeoutSeconds: 30,
            idleTimeoutSeconds: 120,
            gatewayRetryWaitSeconds: 5,
            gatewayRetries: 3,
            edgeRetrySilenceSeconds: 60,
            edgeRetries: 2,
            edgeErrorHeader: { name: 'x-amzn-errortype', contains: 'ForbiddenException' },
            throttledResources: [],
        },
        cron: {
            lockTable: 'cronLocks',
            disablingTable: 'appConfig',
            lockKeyPrefix: 'CRON_',
            lockPollSeconds: 5,
            lockMaxWaitSeconds: 120,
            settleSeconds: 10,
        },
        custom: {},
    },

    dev: {
        apiBaseUrl: 'https://api.example.test/api-dev',
        databaseSecret: 'acme/db/dev',
        aws: { ecsCluster: 'acme-cluster-dev' },
    },

    /** Everything on this machine: Prop Room API, PostgreSQL and LocalStack from docker-compose. */
    local: {
        databaseSecret: 'acme/db/local',
        aws: { endpoint: 'http://localhost:4566', ecsCluster: 'acme-cluster-local' },
    },
};
