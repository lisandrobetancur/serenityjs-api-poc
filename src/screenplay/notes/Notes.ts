import { Notepad, notes } from '@serenity-js/core';

/**
 * Tokens issued to one persona.
 */
export interface Session {
    accessToken: string;
    refreshToken?: string;
}

/**
 * Everything a scenario remembers between steps, definitions and hooks: the typed counterpart of the Java
 * `SessionVariable` constants. Each key has exactly one type; if you need another type, add another key.
 *
 * All actors in a scene share one notepad (see `SceneNotepad`), as the single actor of the Java suite did.
 * Values that belong to one persona are keyed by the actor's name (`sessions`).
 */
export interface Notes {
    /** Tokens per actor name, written by the login tasks and read by `ApiCall.authenticated()`. */
    sessions: Record<string, Session>;

    /** Tenant selected by the scenario's tenant tag (`TenantHook`). */
    tenant: string;
    tenantCode: string;
    tenantDialCode: string;

    /** Test-data account assigned to the scenario's unique tag (`ScenarioUserHook`). */
    scenarioUser: Record<string, string>;
    /** The scenario's unique tag, e.g. `@auth_03`. */
    scenarioTag: string;

    /** Overrides for retry waits, set by `@fast_retries` to keep the retry demos short. */
    retryPolicy: { gatewayRetryWaitSeconds: number; edgeRetrySilenceSeconds: number };

    /** HTTP conditional-request tag remembered from the last response that sent one. */
    etag: string;
    /** Id of a resource the scenario created; `CreatedResourceCleanupHook` deletes it. */
    createdId: number;
    /** Collection the created resource belongs to, e.g. `/categories/{categoryId}`. */
    createdResource: string;
    jobId: string;
    nextCursor: string;
    registeredEmail: string;
    sessionCookie: string;

    /** Original value of a config flag before `ConfigFlagHook` changed it. */
    originalConfigFlag: string;

    /** Results of AWS invocations, written by the interactions and read by their questions. */
    lambdaStatusCode: number;
    lambdaFunctionError: string;
    lambdaPayload: string;
    fargateStatusCode: number;
    fargateTaskArn: string;
    downloadedFilePath: string;
}

/** Typed access to the scene notes from Interactions, Questions and Tasks. */
export const scene = () => notes<Notes>();

/**
 * The notepad shared by every actor of the current scenario.
 *
 * Cucumber.js runs scenarios one at a time in each worker process, so a module-level reference that is
 * replaced at the start of every scenario is scenario-scoped. It is never shared between workers.
 */
export class SceneNotepad {
    // scenario-scoped: replaced by startNewScene() before every scenario
    private static current: Notepad<Notes> = Notepad.empty<Notes>();

    static startNewScene(): void {
        SceneNotepad.current = Notepad.empty<Notes>();
    }

    static get(): Notepad<Notes> {
        return SceneNotepad.current;
    }
}
