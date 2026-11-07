# serenityjs-api-poc

API test suite for the [Prop Room API](https://github.com/lisandrobetancur/prop-room-api), built on a reusable
**Serenity/JS + Screenplay + Cucumber** base migrated from a Java Serenity BDD suite. The base covers REST calls with
retries and controlled reporting, database evidence in the report, AWS integrations (Dynamo, S3, Lambda, Fargate),
ordered hooks, a run summary and safe parallel runs.

- [docs/MIGRATION.md](docs/MIGRATION.md): what was migrated from Java, what changed, what does not apply, gaps.
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): layer rules, tags and hook order.

## Requirements

- Node.js 22+ (tested with Node 24)
- The Prop Room API at `http://localhost:8000` (or `docker compose up -d api`)
- Java 17+ for the Serenity BDD HTML report (`npm run serenity:update` downloads the CLI once)
- Optional: PostgreSQL for `@database` scenarios, Docker for LocalStack (`@localstack`)

## Installation

```bash
npm install
cp .env.example .env   # optional
npm run serenity:update
```

## Commands

| Command                                    | What it does                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                 | Checks (types, SQL safety, scenario ids, test data, shared state), runs the scenarios, then always writes the HTML report, the summary and the run results |
| `TAGS='@products and not @slow' npm test`  | Runs a tag selection (the only supported filter)                                                                                                           |
| `npm run test:parallel`                    | Runs shards in parallel, one per exclusive resource group (`parallel-resources.json`)                                                                      |
| `npm run test:dry`                         | Lists the scenarios that would run without calling anything                                                                                                |
| `npm run test:smoke` / `npm run test:fast` | `@smoke` only / everything except `@slow`                                                                                                                  |
| `npm run lint` / `npm run lint:fix`        | ESLint + Prettier check / fix                                                                                                                              |
| `npm run typecheck`                        | `tsc --noEmit`                                                                                                                                             |
| `npm run report` / `npm run report:open`   | Generates / opens `target/site/serenity/index.html`                                                                                                        |
| `npm run summary` / `npm run results`      | Re-creates the summary / `target/run-results.json` from the last run                                                                                       |
| `npm run sync:scenario-ids`                | Adds missing `@<feature>_NN` ids to new scenarios                                                                                                          |
| `npm run db:setup`                         | Creates the example database on `DB_HOST`                                                                                                                  |
| `npm run fake-api`                         | Starts the fake API standalone on port 8099                                                                                                                |
| `npm run generate:types`                   | Regenerates `src/models/schema.d.ts` from the API's OpenAPI contract                                                                                       |
| `npm run scenarios:csv -- --depth 2`       | Exports the scenario inventory to `target/scenarios.csv`                                                                                                   |

### Database and AWS examples

```bash
# PostgreSQL already installed locally
DB_HOST=localhost DB_USER=$USER npm run db:setup
DB_HOST=localhost DB_USER=$USER npm test

# Everything in Docker: Prop Room API, PostgreSQL (port 5433) and LocalStack
docker compose up -d
ENVIRONMENT=local DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASSWORD=postgres REQUIRE_SERVICES=true npm test
```

## Environment variables

| Variable                                       | Default                    | Purpose                                                                           |
| ---------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `ENVIRONMENT`                                  | `qa`                       | Block of `src/utils/config/environments.ts`; `qa` and unknown names use `default` |
| `API_BASE_URL`                                 | from the environment block | API under test                                                                    |
| `API_KEY`                                      | `test-api-key-123`         | `X-API-Key` for supplier writes                                                   |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | —                          | Database credentials; without `DB_HOST` they come from Secrets Manager            |
| `AWS_REGION`, `AWS_ENDPOINT`                   | from the environment block | `AWS_ENDPOINT=http://localhost:4566` for LocalStack                               |
| `TAGS`                                         | —                          | Cucumber tag expression                                                           |
| `PARALLEL_WORKERS`                             | `4`                        | Maximum shards in `test:parallel`                                                 |
| `REQUIRE_SERVICES`                             | `false`                    | `true`: `@database`/`@localstack` scenarios fail instead of being skipped         |
| `MARKET_OPEN_HOURS`                            | `09:30-16:00`              | Window used by `@requires_closed_market`                                          |
| `LOG_LEVEL`                                    | `debug`                    | Level of `target/logs/test-run.log`                                               |
| `DEFAULT_ACTOR`                                | `Tester`                   | Actor used by hooks and persona-less steps                                        |

## Project structure

```
features/
  <area>/*.feature        Gherkin, one folder per API area (+ framework/ for the base's own scenarios)
  definitions/            Gherkin → Steps (no assertions)
  steps/                  Steps: one action + its assertions, one report node each
  hooks/index.ts          every hook, registered in order
  config/                 Serenity/JS configuration (Cast and reporters)
  support/                parameter types ({actor}, {value}, {method}, {transition}) and value parsing
src/
  screenplay/
    abilities/            CallTheApi, UseCredentials, database/, aws/
    interactions/         api/ApiCall, database/RecordWrites, aws/
    questions/            api/, database/, aws/, notes/
    tasks/<area>/         business tasks; database/<process>/ for DB examples
    actors/, notes/       Cast, personas, typed scene notes
  models/                 generated OpenAPI types + aliases
  entities/               row types and table definitions
  errors/                 one error per integration
  utils/                  config, constants, report, wait, database, aws (connectors, secrets, names, cron),
                          registry, data, tenant, log
scripts/                  run-tests, test-summary, run-results, checks, fake-api, setup-local-db, ...
docker/, docker-compose.yml, parallel-resources.json, test-data/
```

## Personas

| Actor                              | Role              | Seed user              |
| ---------------------------------- | ----------------- | ---------------------- |
| Ada                                | `admin`           | `admin@proproom.test`  |
| Carl                               | `warehouse_clerk` | `clerk@proproom.test`  |
| Vera                               | `viewer`          | `viewer@proproom.test` |
| Any other name (Gus, Nina, Tester) | anonymous guest   | —                      |

`Given Ada the admin is logged in` logs in and stores her tokens in the scene notes; later calls marked
`.authenticated()` send them. Actors can be referred to as `he`, `she` or `they`.

## Extending the base

**A new endpoint call**: add the path to `src/utils/constants/Endpoints.ts`, then a task:

```ts
export const Orders = {
  fetch: (orderId: string) => ApiGet.to(Endpoints.ORDER).authenticated().withPathParams({ orderId }),
};
```

**A new Step and definition**:

```ts
// features/steps/OrderSteps.ts
export const OrderSteps = {
  fetch: (actor: Actor, orderId: string) => step(actor, `#actor fetches order ${orderId}`, Orders.fetch(orderId)),
};

// features/definitions/orders.definitions.ts
when('{actor} fetches order {string}', (actor: Actor, orderId: string) => OrderSteps.fetch(actor, orderId));
```

**A new ability**: extend `Ability`, keep only the connection in it, and give it on demand with
`abilityOf(actor, MyAbility, () => MyAbility.create())` from the interactions that need it.

**A new interaction**: `Interaction.where('#actor …', async actor => { … })`, using `ReportEvidence.show(...)` for
evidence and `QueryReport.record(...)` for SQL, so polls only publish their final attempt.

**A new question**: `Question.about('description', async actor => …)`; prefix `The*`, `Get*` or a predicate name.

## Reading the report

- Each Gherkin step contains its Step node; inside are the REST Queries (method, URL template, headers, bodies) and
  the evidence blocks: **Query executed on database _name_** (statements split by clause, parameters, result table
  with masked columns), `Poll · call N of M`, `PutItem …`, `Invoke …`.
- A retried call appears once, with the response the scenario saw. The retries are counted in the run summary.
- Hook activity is grouped under `Hook before · …` / `Hook after · …`.
- The Context column shows the environment.
- `target/scenario-summary.env`, `target/gateway-failures.tsv` and `target/run-results.json` feed CI notifications.

## Continuous integration

`.github/workflows/api-tests.yml` starts the Prop Room API and PostgreSQL as service containers, runs `npm run lint`,
creates the example database, runs `npm test`, posts the summary to the job page and uploads the report and results.
LocalStack is not started in CI, so `@localstack` scenarios are reported as skipped.
