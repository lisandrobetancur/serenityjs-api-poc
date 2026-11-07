# Migration: Serenity BDD + Screenplay (Java) → Serenity/JS (TypeScript)

This repository carries the reusable base of a Java 21 + Serenity BDD 5 + Cucumber 7 + RestAssured + Hibernate +
AWS SDK v2 API suite over to TypeScript with Serenity/JS, applied to a real target: the
[Prop Room API](https://github.com/lisandrobetancur/prop-room-api). The base itself has no Prop Room knowledge;
project-specific parts are listed in [Adopting the base in another project](#adopting-the-base-in-another-project).

Versions used: Node 24 LTS, TypeScript 5.9 (typescript-eslint supports TypeScript below 6.1), Serenity/JS 3.49,
Cucumber.js 13, AWS SDK v3, `pg` 8, ESLint 10 + typescript-eslint 8, Prettier 3.

## 1. Mapping by concept

| Java (source)                                                   | Serenity/JS (here)                                                            | Where                                                    | Notes                                                                                                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implements Ability` + `static as(actor)`                       | `class X extends Ability`; `X.as(actor)` comes from the base class            | `src/screenplay/abilities`                               | A subclass resolves as its parent: `CallTheApi` is found by `CallAnApi.as(actor)`                                                                                   |
| `Actor.named(...).whoCan(CallAnApi.at(url))` in a `ThreadLocal` | `Cast` in `configure({ actors })` + `actorCalled()` / `actorInTheSpotlight()` | `src/screenplay/actors/Actors.ts`                        | Serenity/JS creates and dismisses actors per scene; no ThreadLocal                                                                                                  |
| One actor per scenario                                          | Role personas (Ada, Carl, Vera, guests) **sharing one scene notepad**         | `src/screenplay/notes/Notes.ts`                          | Decision: Prop Room needs several roles per scenario. Shared notes keep the Java "one memory per scenario"; per-persona values are keyed by actor name (`sessions`) |
| `actor.remember/recall` + `SessionVariable`                     | `TakeNotes.using(SceneNotepad.get())` + typed `Notes` interface               | `src/screenplay/notes/Notes.ts`                          | "One key, one type" is now checked by the compiler                                                                                                                  |
| `implements Task` + `instrumented()`                            | `Task.where('#actor …', ...activities)`                                       | `src/screenplay/tasks`                                   |                                                                                                                                                                     |
| `IsSilent`                                                      | A task that returns the call directly (no `Task.where`)                       | e.g. `Products.fetch`                                    | No marker exists; single-call tasks are plain factories                                                                                                             |
| `implements Interaction`                                        | `Interaction.where(...)` or a class extending `Interaction`                   | `ApiCall`, `RecordWrites`, AWS interactions              |                                                                                                                                                                     |
| `Question<T>` / `@Subject`                                      | `Question.about(...)`, `.describedAs()`                                       | `src/screenplay/questions`                               |                                                                                                                                                                     |
| `actor.should(seeThat("label:", q, matcher))`                   | `Ensure.that(q.describedAs('label:'), expectation)`                           | `features/steps/ResponseSteps.ts`                        | `Ensure` is a hard assertion; there are no soft asserts to switch off                                                                                               |
| Several `seeThat` in one `should`                               | One Step (`Task.where`) with several `Ensure`                                 | `ResponseSteps.bodyContains`                             | One payload, one report node                                                                                                                                        |
| `@Step("text {0}")`                                             | `step(actor, \`text ${param}\`, ...)`                                         | `features/steps/step.ts`                                 |                                                                                                                                                                     |
| `@Steps` injection                                              | Import of `features/steps/*` objects                                          |                                                          |                                                                                                                                                                     |
| `SerenityRest.lastResponse()`                                   | `LastResponse.status()/body()/header()`                                       |                                                          | `ApiCall` keeps `LastResponse` working (see §2)                                                                                                                     |
| `Serenity.recordReportData()`                                   | `actor.collect(TextData.fromJSON(...), new Name(title))`                      | `src/utils/report`                                       | `HTTPRequestResponse`, `TextData`, `JSONData` are available                                                                                                         |
| `@Before(order = n)` / `@After(order = n)`                      | Cucumber `Before` / `After` registered in order in one file                   | `features/hooks/index.ts`                                | Cucumber.js has no `order` (§3.2)                                                                                                                                   |
| `ThreadLocal`                                                   | Scene notes, or `AsyncLocalStorage` for call-chain scopes                     | `ReportBuffer`, `QueryReport`                            | Workers are processes, not threads                                                                                                                                  |
| Static `ConcurrentHashMap` shared by threads                    | Module singleton **per worker process**                                       | `RunRegistry`, `DatabaseClientProvider`, `AwsConnectors` | Coordination across workers needs files or Dynamo (§4)                                                                                                              |
| JUnit `exclusive-resources`                                     | Shards by resource (`parallel-resources.json`)                                | `scripts/lib/shards.ts`                                  | Replaces Cucumber `--parallel`, which Serenity/JS cannot report on (§4)                                                                                             |
| `serenity.conf` (HOCON per environment)                         | `environments.ts` + `ENVIRONMENT`                                             | `src/utils/config`                                       |                                                                                                                                                                     |
| Gradle `testSummary`                                            | `scripts/test-summary.ts` over the Serenity JSON                              |                                                          |                                                                                                                                                                     |
| `run_results.py`                                                | `scripts/run-results.ts`                                                      |                                                          |                                                                                                                                                                     |

## 2. Mapping by layer

### Abilities

| Java                                                                            | Here                                                                                                                                                                                                                                             | Status                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `CallAnApi` (RestAssured)                                                       | `CallTheApi extends CallAnApi`: 30 s connect / 120 s idle timeouts, timeouts recorded as **status 0**, response time measured                                                                                                                    | Complete                                             |
| `InteractWithDatabase` (Hibernate + HikariCP)                                   | Port `DatabaseClient` + adapter `PgDatabaseClient` (`pg` Pool), `DatabaseClientProvider` caches a pool per database and closes them in `AfterAll`; a connection error discards the cached pool; `SET LOCAL lock_timeout = '30s'` in transactions | Complete, verified against PostgreSQL 17             |
| `InteractWithDynamo`, `InteractWithEcs`, `InteractWithLambda`, `InteractWithS3` | Same names, in one module (`abilities/aws/AwsAbilities.ts`) because each is a few lines; clients come from `AwsConnectors`                                                                                                                       | Complete, type-checked; not run (no LocalStack here) |

### Interactions

| Java                                                                                     | Here                                                                                                                                                                                                                                                                                                                                                                                               | Status                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `ApiCall` + verbs                                                                        | `ApiCall` (Interaction) + `ApiGet/ApiPost/ApiPut/ApiPatch/ApiDelete/ApiHead/ApiOptions` with the full fluent API (`withBody`, `authenticated`, `authenticatedWith`, `withQueryParams`/`withPathParams` as maps, `withHeader`, `withFile`, `withFileBody`, `withContentType`, `external`, `withGatewayRetry`) plus `withRawBody`, `withFileContent`, `withoutFollowingRedirects`, `expectingBinary` | Complete                                    |
| Retries 502 (any verb), 504 (GET only), edge 403 (silence × attempt)                     | Same rules, waits and log lines; overridable per scenario with `@fast_retries`                                                                                                                                                                                                                                                                                                                     | Complete, demonstrated against the fake API |
| Throttling of edge-limited resources                                                     | `Throttle` (sliding window) driven by `http.throttledResources`                                                                                                                                                                                                                                                                                                                                    | Complete; window is per worker              |
| `SaveRecord`, `UpdateRecord`, `UpdateRecords`, `BulkUpdateRecords`, `DeleteRecord`       | Same names in `interactions/database/RecordWrites.ts`                                                                                                                                                                                                                                                                                                                                              | Complete                                    |
| Dynamo builders incl. `ExpireDynamoItem`                                                 | Same step builders                                                                                                                                                                                                                                                                                                                                                                                 | Complete, not run                           |
| `RunFargateTask`, `InvokeLambda…RetryingWhenThrottled`                                   | Same                                                                                                                                                                                                                                                                                                                                                                                               | Complete, not run                           |
| `UploadFileToS3` (resource, bytes, Excel, CSV), `DownloadFileFromS3`, `DeleteFileFromS3` | Same; Excel via `exceljs`                                                                                                                                                                                                                                                                                                                                                                          | Complete, not run                           |

**How `ApiCall` keeps one REST Query per call.** `Send` reports every request it makes. `ApiCall` calls
`CallAnApi.request()` itself for each attempt (that method stores the response as the "last response"), and only
after the final attempt collects one `HTTPRequestResponse` artifact, built the same way `Send` builds it. The
recorded URL is the template (`/products/{productId}`), so ids never reach the summary.

### Questions

| Java                                                                                                                                                                                                                                                    | Here                                                                                                                                                           | Status                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `TheStatusCode`, `TheResponseBody`, `TheResponseList`, `TheJsonPath.*At`, `TheResponseTime`                                                                                                                                                             | Same names in `questions/api/ResponseQuestions.ts`; `decimalAt` returns `decimal.js` `Decimal` (exact), `dateAt` returns `Date`; both `undefined` when missing | Complete                    |
| —                                                                                                                                                                                                                                                       | `TheResponseHeader.called/valueOf/cookie`                                                                                                                      | Added                       |
| `TheNote`                                                                                                                                                                                                                                               | `TheNote.called(key)` fails naming who should have written the note                                                                                            | Complete                    |
| `GetDynamoItem`, `GetDynamoItems` (paginated scan, strings only), `GetTimeLock` (was `GetCronLock`), `GetDisablingKey`, `TheFargateStatusCode`, `TheFargateTask`, `TheLambdaStatusCode`, `TheLambdaFunctionError`, `GetS3FileContent`, `S3ObjectExists` | Same                                                                                                                                                           | Complete, not run           |
| Database questions                                                                                                                                                                                                                                      | `GetRecordById`, example `TheOrder.withReference`, `GetUsersOfTenant`; `readRows()` helper records the statement and the result                                | Reference + working example |

Use `TheJsonPath` when the path comes from Gherkin or config; use the Serenity/JS proxy
(`LastResponse.body<Product>().category.name`) when the path is known at compile time.

### Tasks, models, entities, factories, errors

- **Tasks**: one module per API area in `src/screenplay/tasks/<area>`, endpoints from `src/utils/constants/Endpoints.ts`.
  Database example: `tasks/database/orders/OrderRecords.ts` (`ExpireRecord.withTheRecord(id)`).
- **Models**: generated from the OpenAPI contract (`src/models/schema.d.ts`, `npm run generate:types`) with friendly
  aliases in `src/models/types.ts`. Literal objects replace Lombok builders. Schema validation with `zod` was left out
  (the generated types already describe the contract); add it in a body Question if runtime validation is wanted,
  as a precondition (a response that does not match the schema makes later assertions meaningless).
- **Entities**: row types + `TableDefinition` (`table`, `primaryKey`, `maskedColumns`, `database`) in `src/entities`.
- **Factories**: none were needed; Prop Room payloads are literals in the definitions. Create one only when it adds
  config, generated data, defaults or a domain decision.
- **Errors**: `src/errors/IntegrationErrors.ts`, one class per integration, with the SDK error as `cause`.

### Utilities

| Java                                                                                                          | Here                                                                                                                     | Status            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Connectors                                                                                                    | `AwsConnectors` (lazy per process, region/endpoint from config, LocalStack credentials, `closeAll()`)                    | Complete          |
| `SecretReader`                                                                                                | Same, caches the raw string per name; failures are not cached. `DB_HOST` bypasses it for local databases                 | Complete          |
| Name resolution (prefix / suffix / template)                                                                  | `DatabaseNames.resolve`, `ResourceNames.withSuffix/fromTemplate`                                                         | Complete          |
| `CronLaunchGate` + `CronLocks` + turn                                                                         | Same; the turn is a **cross-process lock file** (`proper-lockfile`)                                                      | Complete, not run |
| `QueryReport`, `QueryResultTable`, write evidence, `ReportEvidence`, `ReportStep`, `HookStep`, `ReportBuffer` | Same names in `src/utils/report`, scopes on `AsyncLocalStorage`                                                          | Complete          |
| `WaitUtils`                                                                                                   | `waitSeconds`, `waitMillis`, retry waits with their log lines, `pollUntil` (last value, only the final attempt reported) | Complete          |
| `RunRegistry`                                                                                                 | Same API (`register`, `peek`, `drain(key[, scope])`); per worker                                                         | Complete          |
| `EnvironmentConfig`                                                                                           | Same rules: `qa` → `default`, unknown → `default`, raw name via `getEnvironment()`, flags by name                        | Complete          |
| `TestDataLoader`                                                                                              | Indexed by the scenario's unique tag; `scenarioTagOf`, `userFor`, `featureIds`                                           | Complete          |
| Tenant enum                                                                                                   | `Tenant` catalog + `TenantHook` → default `X-Tenant` header                                                              | Complete          |

`Wait.until` from Serenity/JS was not enough for polls: it reports every attempt and answers nothing, while the suite
needs the last value (to assert the final state) and only the last attempt in the report. `pollUntil` is a
Question that runs its reads outside `attemptsTo` and publishes the final attempt's evidence.

### Hooks

All implemented in `features/hooks`: feature scope, status tags, performance, time windows, service gates, actor
scene, API reset (project specific), scenario user, tenant, retry policy, config flag (force + restore with
retries and an asserted re-read), created-resource cleanup, feature cleanup. Order in [CONVENTIONS](CONVENTIONS.md#hook-order).

## 3. Runtime decisions

### 3.1 Threads vs processes

Cucumber.js runs each worker as a **process**. Each Java mechanism was reviewed:

| Java mechanism                            | Decision                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ThreadLocal<Actor>`                      | Not needed: the Cast creates actors per scene                                                                                            |
| `ThreadLocal<Deque>` for query scopes     | `AsyncLocalStorage` (follows the async call chain)                                                                                       |
| `ConcurrentHashMap` registry of resources | Per worker; each worker only undoes what it registered                                                                                   |
| Pool of DB connections shared by threads  | One pool per database per worker                                                                                                         |
| `ReentrantLock` launch turn for crons     | Lock file shared by every process of the run (`target/locks`). Use a conditional write in Dynamo if workers ever run on several machines |
| "End of feature" detection                | Not possible per worker (a feature's scenarios can run in several shards); cleanup runs per worker in `AfterAll`                         |

### 3.2 Hook order

Java orders hooks with `order`; Cucumber.js runs `Before` hooks in definition order and `After` hooks in reverse.
Every hook is registered in `features/hooks/index.ts`, top to bottom, so the file _is_ the order. Table in
[CONVENTIONS](CONVENTIONS.md#hook-order).

### 3.3 Asynchrony and timeouts

Everything is `async`; waits are awaited timers. Cucumber's default step timeout is set to 5 minutes (edge silences
of 60 s × attempt and long polls). A Step that needs more passes `{ timeout }` to its definition. Serenity/JS
`interactionTimeout` is also 5 minutes.

### 3.4 Skips

A `Before` hook that returns `'skipped'` marks the scenario as skipped; the later `Before` hooks and the steps do
not run. Skipped scenarios are written to the Serenity JSON as `SKIPPED`, so the summary counts them by reason.
The Java `ScenarioSkip` / `TestAbortedException` machinery is not needed.

### 3.5 Failing scenarios

A failed `Ensure` fails the step and the scenario, and the report shows it red. The Java re-check of failures in
`@After` (a workaround for the JUnit Platform engine) is not needed.

## 4. Parallel execution

`npm run test:parallel` splits the selected scenarios into **shards**, one serial Cucumber process each, at most
`PARALLEL_WORKERS`. Every resource in `parallel-resources.json` belongs to exactly one shard, so scenarios that need
the same resource never overlap. All shards write to the same `target/site/serenity`, and the report and summary
cover them all.

Why not Cucumber's `--parallel`: in that mode the Serenity/JS formatter runs in the coordinator process and the
actors in the workers, so the reporter receives activity events for scenes it never saw start
(`No domain event queue found for scene`). This is a known limitation of Serenity/JS with Cucumber.js parallel mode
([cucumber-js#2156](https://github.com/cucumber/cucumber-js/issues/2156)).

With Prop Room, every scenario resets the API's global seed data, so all Prop Room features share one resource
(`prop-room-seed`) and run in one shard; the framework, database and LocalStack features run in their own shards.
Rules for parallel safety: no mutable module state outside per-worker caches (`npm run check:shared-state`), no
test-data account shared by two features (`npm run check:test-data`), cross-process cron turns.

## 5. Not migrated (and why)

- Serenity Java's two event buses (`getEventBus` / `getParallelEventBus`), `TestSession` and its replay: internals of
  the Java parallel reporter.
- `ScenarioSkip` and the JUnit abort, `ScenarioDurationHook` (Java serial-reporter bug), `RestStepTitle` as an
  event, disabling soft asserts.
- `instrumented(...)` and `#field` interpolation in `@Step`: TypeScript template literals do it.
- Hibernate specifics: `@Formula`, `@ColumnTransformer`, `merge` of every column, the `POST_LOAD` listener, the
  persister's dirty-check, `hbm2ddl=validate`, a `SessionFactory` per entity set. Without an ORM the write rule is
  "read the row, compute the diff, write only the changed columns", and the reported SQL is the executed SQL. If a
  team adopts an ORM (TypeORM, MikroORM, Drizzle, Kysely), use its change tracking for the diff and never save a
  partially built entity.
- JDT vs `javac` generics quirks, custom Spotless rules, mandatory Javadoc (TSDoc is used where it helps).
- Business calculations, catalogs, concrete mocks and datasets of the source project.
- `bcryptjs` (password hashing) and `@faker-js/faker` (generated data) are not installed: nothing in this suite needs
  them. Add them with the first factory that does.

## 6. Gaps

- **Report Context column**: the Serenity/JS reporter leaves `context` empty; `scripts/set-report-context.ts` writes
  the environment into the JSON before `serenity-bdd run`.
- **`· call N of M` on REST queries**: Serenity BDD does not display artifact names for REST queries, so `pollUntil`
  also publishes a `Poll · call N of M` evidence entry next to the final REST query.
- **AWS layer not executed here**: Docker was not running, so LocalStack could not start. The AWS code is
  type-checked and the `@localstack` scenarios are skipped with a logged reason. Run `docker compose up -d` and
  `ENVIRONMENT=local npm test` to execute them. ECS/Fargate is not available in LocalStack Community, so
  `RunFargateTask` has no LocalStack scenario.
- **Timeouts as status 0**: only demonstrable with a hung server; the idle timeout (120 s) is too long for a demo.
- **Throttle window** is per worker process; with several shards hitting the same rate-limited resource, use a
  shared limiter (Dynamo or a file lock).

## 7. Runner: option A (implemented) vs option B

| Aspect                              | A: Serenity/JS + Cucumber.js (here)                     | B: Serenity/JS + Playwright Test (+ playwright-bdd)                                             |
| ----------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Gherkin                             | Native                                                  | Through `playwright-bdd` (code generation step)                                                 |
| Actor life cycle                    | Cast per scene, `actorCalled`                           | Fixtures (`actor`, `actorCalled`) per test                                                      |
| Hooks and order                     | `Before`/`After` in definition order, one registry file | Fixtures with explicit dependencies, `beforeEach`                                               |
| Parallelism and exclusive resources | Shards by resource (external runner)                    | Native workers; exclusivity via `test.describe.configure({ mode: 'serial' })` or projects       |
| Global teardown                     | `AfterAll` per worker + post-run scripts                | `globalSetup` / `globalTeardown`                                                                |
| Report                              | Same Serenity BDD HTML as the Java suite (needs a JRE)  | Playwright HTML report natively; Serenity BDD HTML still possible with the Serenity/JS reporter |
| Evidence                            | `actor.collect` artifacts                               | Same, plus Playwright attachments                                                               |
| Tag filtering                       | Cucumber tag expressions                                | `--grep` / tags; Gherkin tags through playwright-bdd                                            |
| Retries                             | Own (`ApiCall`)                                         | Own for HTTP, plus test-level retries                                                           |
| Adoption cost                       | Lowest from the Java suite                              | Higher: fixtures replace hooks and steps                                                        |

## Adopting the base in another project

Fill in, in this order:

1. `src/utils/config/environments.ts`: base URLs, secret names, AWS region/endpoints, ECS cluster and network, retry
   settings, edge header, throttled resources, cron table names.
2. `src/utils/constants/Endpoints.ts` and `src/models` (run `npm run generate:types` against your contract).
3. `src/screenplay/actors/Personas.ts` (or a single actor) and `src/utils/tenant/Tenant.ts`.
4. `src/utils/database/DatabaseNames.ts`, `src/entities`, `src/utils/aws/ResourceNames.ts`, `src/utils/aws/cron/CronLocks.ts`.
5. `parallel-resources.json`, `test-data/scenario-users.json`.
6. Replace the Prop Room-specific `ApiResetHook` in `features/hooks/index.ts` with your own preconditions.
