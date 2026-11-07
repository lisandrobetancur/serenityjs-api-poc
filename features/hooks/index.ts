import { After, AfterAll, Before, BeforeAll, type ITestCaseHookParameter, setDefaultTimeout } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { actorCalled, Interaction } from '@serenity-js/core';

import { startFakeApi } from '../../scripts/fake-api';
import {
    Categories,
    DEFAULT_ACTOR,
    Platform,
    PurchaseOrders,
    SceneNotepad,
    scene,
    Suppliers,
    TheStatusCode,
    Users,
} from '../../src/screenplay';
import { TestDataLoader } from '../../src/utils/data/TestDataLoader';
import { logger } from '../../src/utils/log/logger';
import { RunRegistry } from '../../src/utils/registry/RunRegistry';
import { HookStep, ReportEvidence } from '../../src/utils/report/ReportEvidence';
import { Tenant } from '../../src/utils/tenant/Tenant';
import { Endpoints } from '../../src/utils/constants/Endpoints';
import { AwsConnectors } from '../../src/utils/aws/AwsConnectors';
import { DatabaseClientProvider } from '../../src/utils/database/DatabaseClientProvider';
import { FeatureCleanup } from '../../src/utils/registry/FeatureCleanup';
import { Authenticate } from '../../src/screenplay';
import { ConfigFlagHooks } from './config-flag';
import { isSkippedPerformanceScenario, SKIPPED, statusTagOf, tagsOf, timeWindowSkipReason } from './scenario-gates';
import { unavailableService } from './service-gates';

/*
 * The single place where hooks are registered, in order.
 *
 * Cucumber.js has no `order` attribute: `Before` hooks run in the order they are defined and `After` hooks in
 * reverse order. Registering every hook here, top to bottom, reproduces the Java `@Before(order = n)` sequence.
 * See docs/CONVENTIONS.md, "Hook order", for the table.
 */

/** Generous default: edge silences (60 s per attempt) and polls can take minutes. A Step can ask for more. */
setDefaultTimeout(5 * 60 * 1000);

const hookActor = () => actorCalled(DEFAULT_ACTOR);

// Run level -----------------------------------------------------------------------------------------------------------

// per-worker: one fake API per worker process, started in BeforeAll and closed in AfterAll
let fakeApi: Awaited<ReturnType<typeof startFakeApi>> | undefined;

BeforeAll(async () => {
    fakeApi = await startFakeApi();
    process.env.FAKE_API_URL = fakeApi.url;
});

// FeatureCleanupHook: undo what this worker's scenarios registered for cleanup, then release connections.
AfterAll(async () => {
    await FeatureCleanup.runAll(() => actorCalled('Ada'));
    await fakeApi?.close();
    await DatabaseClientProvider.closeAll();
    AwsConnectors.closeAll();
});

// Users registered by the registration scenarios are deleted at the end (a 404 means a reset already removed them).
FeatureCleanup.on('registeredUserIds', async (admin, ids) => {
    await admin.attemptsTo(Authenticate.withBearerToken());
    for (const id of ids as number[]) {
        await admin.attemptsTo(Users.remove(id));
    }
});

// Before, in order ----------------------------------------------------------------------------------------------------

// order -2 · FeatureScopeHook: the feature is the scope of RunRegistry entries.
Before(({ pickle }: ITestCaseHookParameter) => {
    RunRegistry.setScope(pickle.uri);
});

// order -1 · StatusTagsHook: known problems and unfinished work are skipped, and counted apart in the summary.
Before((scenario: ITestCaseHookParameter) => {
    const statusTag = statusTagOf(tagsOf(scenario));
    if (statusTag) {
        logger.info({ scenario: scenario.pickle.name, statusTag }, 'Scenario skipped by status tag');
        return SKIPPED;
    }
    return undefined;
});

// order -1 · PerformanceHook
Before((scenario: ITestCaseHookParameter) => (isSkippedPerformanceScenario(tagsOf(scenario)) ? SKIPPED : undefined));

// order -1 · TimeWindowHooks
Before((scenario: ITestCaseHookParameter) => {
    const reason = timeWindowSkipReason(tagsOf(scenario));
    if (reason) {
        logger.info({ scenario: scenario.pickle.name, reason }, 'Scenario skipped by time window');
        return SKIPPED;
    }
    return undefined;
});

// order -1 · ServiceGates: optional infrastructure must be reachable (or the scenario is skipped).
Before({ tags: '@database' }, async () => ((await unavailableService('@database')) ? SKIPPED : undefined));
Before({ tags: '@localstack' }, async () => ((await unavailableService('@localstack')) ? SKIPPED : undefined));

// order 0 · ActorHook: a fresh scene notepad shared by every actor of the scenario.
// Serenity/JS creates and dismisses the actors per scene, and a failed Ensure fails the scenario, so neither the
// Java ThreadLocal nor its "did any step fail?" re-check are needed.
Before(() => {
    SceneNotepad.startNewScene();
});

// order 1 · ApiResetHook (project specific): every Prop Room scenario starts from the seed data.
Before({ tags: 'not @no_reset' }, () =>
    hookActor().attemptsTo(
        HookStep.before(
            'Reset the API to its seed data',
            Platform.resetToSeedData(),
            Ensure.that(TheStatusCode.was(), equals(200)),
        ),
    ),
);

// order 1 · ScenarioUserHook: the account assigned to the scenario's unique tag.
Before((scenario: ITestCaseHookParameter) => {
    const scenarioTag = TestDataLoader.scenarioTagOf(tagsOf(scenario));
    const user = scenarioTag ? TestDataLoader.userFor(scenarioTag) : undefined;
    if (!scenarioTag || !user) {
        return undefined;
    }
    return hookActor().attemptsTo(
        HookStep.before(
            `Assign the test-data account of ${scenarioTag}`,
            scene().set('scenarioTag', scenarioTag),
            scene().set('scenarioUser', user),
            Interaction.where('#actor shows the assigned account', actor =>
                ReportEvidence.showRow(actor, 'Scenario account', Object.keys(user), Object.values(user)),
            ),
        ),
    );
});

// order 1 · TenantHook: the tenant tag decides the default X-Tenant header.
Before((scenario: ITestCaseHookParameter) => {
    const tenant = Tenant.fromTags(tagsOf(scenario));
    if (!tenant) {
        return undefined;
    }
    return hookActor().attemptsTo(
        HookStep.before(
            `Select the tenant ${tenant.displayName}`,
            scene().set('tenant', tenant.displayName),
            scene().set('tenantCode', tenant.code),
            scene().set('tenantDialCode', tenant.dialCode),
        ),
    );
});

// order 1 · RetryPolicyHook: `@fast_retries` shortens the retry waits so the retry demos run in seconds.
Before({ tags: '@fast_retries' }, () =>
    hookActor().attemptsTo(
        HookStep.before(
            'Shorten the retry waits',
            scene().set('retryPolicy', { gatewayRetryWaitSeconds: 0.2, edgeRetrySilenceSeconds: 0.3 }),
        ),
    ),
);

// order 1 · ConfigFlagHook (Before) and, by reverse order, its restore runs before the cleanups below.
ConfigFlagHooks.register(hookActor);

// After, registered in reverse of their execution order ---------------------------------------------------------------

// order -1 · FeatureScopeHook (runs last)
After(() => {
    RunRegistry.setScope('run');
});

// order 1 · CreatedResourceCleanupHook: deletes what an opted-in scenario created, before the actors are dismissed.
After({ tags: '@cleanup_created' }, async () => {
    const notepad = SceneNotepad.get();
    if (!notepad.has('createdId') || !notepad.has('createdResource')) {
        return;
    }
    const resource = notepad.get('createdResource');
    const removal = {
        [Endpoints.CATEGORY]: () => Categories.removeTheCreatedOne(),
        [Endpoints.SUPPLIER]: () => Suppliers.removeTheCreatedOne(),
        [Endpoints.PURCHASE_ORDER]: () => PurchaseOrders.remove(notepad.get('createdId')),
    }[resource];
    if (!removal) {
        logger.warn({ resource }, 'No cleanup is defined for the created resource');
        return;
    }
    await actorCalled('Ada').attemptsTo(HookStep.after(`Delete the ${resource} created by the scenario`, removal()));
});
