# Conventions

## Layers

```
.feature (Gherkin)
  → Definition  features/definitions   calls Steps, passes scenario values, decides the order; never asserts
    → Step      features/steps         one action and its assertions; one node in the report
      → Task    src/screenplay/tasks   receives a ready-made payload; acts, never asserts
        → Interaction                  one HTTP call (ApiCall), one database write, one AWS call
      → Question                       a value to read or assert
```

Golden rule: **Tasks act, Questions read, Steps assert.** Every assertion goes through the actor (`Ensure`), so it
shows up in the report.

## Definitions

- Only call functions from `features/steps`, with values from the scenario. No `attemptsTo`, `answer` or `Ensure`.
- One phrase per expression. Alternatives are expanded by `phrases()` in `define.ts` (`[his|her|their]` registers
  three expressions that share one function); two definitions with the same body become one with two phrases.
- A wait goes through the `waits for N seconds` step, the only step that does not assert.

## Steps

- A Step is `step(actor, title, ...activities)`: a `Task.where` with a parameterised title.
- One action and its assertions. Still one Step: polling or retrying the same action; a write and the re-read of the
  same record; a status gate and the read of the same body; a batch of the same action asserted as a whole; a gate
  that waits for someone else's state and overrides it when the wait runs out.
- Two actions are two Steps; the first returns what the second needs. A Step never calls another Step.
- Assertion shape: the **status gate** is its own `Ensure`; body checks are grouped in one Step with one labelled
  `Ensure` per field (`describedAs('field:')`).
- Gherkin keeps the When/Then split, so a When Step performs the action and the Then Step asserts on the last
  response; preconditions (`Given … has …`) assert their own outcome.

## Tasks

- Receive the payload already built and params as maps; never build payloads inside.
- Endpoints come from `Endpoints`, with `{placeholders}` for path params.
- **Silent by default**: a task with one call returns the `ApiCall` directly, so the report does not gain a level.
  Use `Task.where` only when the task composes several activities and the name adds something.
- Database tasks read the row, change it and write only what changed; never build a partial row.

## Questions

- `The*` for a value, `Get*` / `Count*` for an artifact you fetch, a predicate for a condition (`S3ObjectExists`).
- Database questions: the statement is a constant with named parameters (`:name`), read-only, `LIMIT 1` when several
  rows qualify, recorded with `QueryReport.record` before it runs, ids returned as `string`.

## Notes (scenario memory)

- The only channel for state between steps, definitions and hooks. Keys are declared in `Notes` with one type each;
  a different type is a different key.
- All actors of a scenario share the notepad; per-persona values are keyed by actor name (`sessions`).

## Native SQL

- Named parameters only. Identifiers (tables, columns) go through `identifier()`; a line that interpolates already
  checked identifiers ends with `// sql-safe: <reason>`. `npm run check:sql` enforces it.

## Module state

- No mutable module-level state in steps, hooks or the Screenplay layer, except per-worker caches and scenario-scoped
  references marked `// per-worker:` or `// scenario-scoped:`. `npm run check:shared-state` enforces it.

## Tags

| Tag                                                                            | Meaning                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `@auth`, `@products`, … (first line of the feature)                            | Feature tag; decides the scenario ids and the parallel resource                       |
| `@<feature>_NN`                                                                | Unique scenario id (`npm run sync:scenario-ids` assigns missing ones)                 |
| `@smoke`                                                                       | Quick health of the main flows                                                        |
| `@slow`                                                                        | Takes seconds on purpose (token expiry, report jobs)                                  |
| `@wip`, `@skip`, `@bug_reported`, `@finding_reported`, `@improvement_reported` | Skipped, counted apart by reason                                                      |
| `@performance`                                                                 | Skipped unless TAGS names `@performance`                                              |
| `@requires_business_day`, `@requires_closed_market`                            | Skipped outside the time window                                                       |
| `@acme_land` (tenant tags)                                                     | Selects the tenant and the `X-Tenant` header                                          |
| `@fast_retries`                                                                | Shortens retry waits (demos)                                                          |
| `@no_reset`                                                                    | Does not reset the Prop Room seed data before the scenario                            |
| `@database`, `@localstack`                                                     | Need optional infrastructure; skipped when unreachable unless `REQUIRE_SERVICES=true` |
| `@requires_mock_x`                                                             | Forces the `MOCK_X` config flag and restores it afterwards                            |
| `@cleanup_created`                                                             | Deletes the resource the scenario created (id in notes)                               |

## Hook order

`Before` hooks run top to bottom as registered in `features/hooks/index.ts`; `After` hooks run in reverse
registration order. The "Java order" column is the `order` the hook had in the source suite.

| Phase     | Hook                       | Java order | Tags                       | What it does                                                                |
| --------- | -------------------------- | ---------- | -------------------------- | --------------------------------------------------------------------------- |
| BeforeAll | Fake API                   | —          | —                          | Starts the fake API of this worker (`FAKE_API_URL`)                         |
| Before    | FeatureScopeHook           | −2         | —                          | Sets the `RunRegistry` scope to the feature                                 |
| Before    | StatusTagsHook             | −1         | status tags                | Skips                                                                       |
| Before    | PerformanceHook            | −1         | `@performance`             | Skips unless asked for                                                      |
| Before    | TimeWindowHooks            | −1         | time tags                  | Skips outside the window                                                    |
| Before    | ServiceGates               | −1         | `@database`, `@localstack` | Skips (or fails with `REQUIRE_SERVICES`) when unreachable                   |
| Before    | ActorHook                  | 0          | —                          | New scene notepad                                                           |
| Before    | ApiResetHook               | 1          | not `@no_reset`            | `POST /__reset` (Prop Room specific)                                        |
| Before    | ScenarioUserHook           | 1          | unique id tag              | Test-data account into notes                                                |
| Before    | TenantHook                 | 1          | tenant tags                | Tenant values into notes                                                    |
| Before    | RetryPolicyHook            | 1          | `@fast_retries`            | Short retry waits                                                           |
| Before    | ConfigFlagHook (force)     | 1          | `@requires_mock_x`         | Forces the flag, remembers the original                                     |
| After     | ConfigFlagHook (restore)   | 1          | `@requires_mock_x`         | Restores with retries and an asserted re-read                               |
| After     | CreatedResourceCleanupHook | 1          | `@cleanup_created`         | Deletes the created resource before actors are dismissed                    |
| After     | FeatureScopeHook           | −1         | —                          | Resets the scope                                                            |
| AfterAll  | FeatureCleanupHook         | —          | —                          | Drains `RunRegistry` with the registered handlers, closes pools and clients |

Everything a hook reads, writes or asserts is wrapped in `HookStep.before('…')` / `HookStep.after('…')`, so the
report groups it in one collapsible node.
