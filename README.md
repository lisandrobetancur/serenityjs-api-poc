# serenityjs-api-poc

API test suite for the [Prop Room API](https://github.com/lisandrobetancur/prop-room-api), built with
[Serenity/JS](https://serenity-js.org), the **Screenplay Pattern**, **Cucumber** and **Gherkin**, in TypeScript.

The Prop Room API is an inventory-management service for a theatre's props department. The suite covers
all of its endpoints: authentication schemes, users, products, categories, suppliers, warehouses, stock levels,
movements, purchase orders, asynchronous reports and generic HTTP behaviour (redirects, caching, rate limits,
content negotiation, idempotency and so on).

## Requirements

- Node.js >= 20.12 (tested with Node 24)
- A running Prop Room API, by default at `http://localhost:8000`
- Java 17+ (only needed to generate the Serenity BDD HTML report)

Start the API with Docker if you don't have it running locally:

```bash
docker run --rm -p 8000:8000 ghcr.io/lisandrobetancur/prop-room-api:latest
```

## Installation

```bash
npm install
cp .env.example .env   # optional
```

## Commands

| Command | Description |
| --- | --- |
| `npm test` | Run every scenario |
| `npm run test:smoke` | Run the `@smoke` scenarios only |
| `npm run test:fast` | Skip the `@slow` scenarios (token expiry, report generation) |
| `npm run test:tags -- "@inventory and not @slow"` | Run the scenarios matching a tag expression |
| `npm run lint:types` | Type-check the project |
| `npm run generate:types` | Regenerate `src/api/schema.d.ts` from the API's OpenAPI contract |
| `npm run serenity:update` | Download the Serenity BDD CLI (once) |
| `npm run test:report` | Run the tests and generate the HTML report in `target/site/serenity` |

Every scenario starts from the seed data: a `Before` hook calls `POST /__reset`.

## Coverage

| Area | Feature files | What is covered |
| --- | --- | --- |
| `@auth` | `features/auth` | JWT login, refresh-token rotation, logout/revocation, expiry, OAuth2 form, HTTP Basic, API key, cookie session, registration |
| `@users` | `features/users` | Role-based access, self vs. other users, role changes, deletion rules |
| `@products` | `features/products` | Filters, sorting, offset pagination and `Link` headers, `HEAD`, ETags (`304`, `412`), PUT/PATCH/merge-patch, plain-text descriptions, photo upload/download (`413`, `415`), CSV import |
| `@catalog` | `features/catalog` | Categories CRUD, suppliers with cursor pagination and API-key writes |
| `@inventory` | `features/inventory` | Warehouses, stock levels, counts with mandatory `If-Match` (`428`, `412`), ledger, low-stock alerts, in/out/transfer movements, idempotency, immutability (`405`) |
| `@purchasing` | `features/purchasing` | Purchase-order lifecycle, valid and invalid transitions, idempotent creation, receiving into stock |
| `@reports` | `features/reports` | Asynchronous jobs (`202`, polling, `409` while running, downloads) |
| `@platform` | `features/platform` | Health, maintenance mode (`503`), request ids, echo, redirects, `OPTIONS`, `400`/`415`, chaos codes, `500`, rate limiting (`429`), cookies, form posts |

## Personas

The actor's name in a scenario decides which credentials they use (see `src/screenplay/actors/Personas.ts`):

| Persona | Role | Seed user |
| --- | --- | --- |
| Ada | `admin` | `admin@proproom.test` |
| Carl | `warehouse_clerk` | `clerk@proproom.test` |
| Vera | `viewer` | `viewer@proproom.test` |
| Any other name (e.g. Gus, Nina) | anonymous guest | none |

Scenarios can add the role for readability, e.g. `Given Ada the admin is logged in`, and later refer to the
actor as `he`, `she` or `they`.

## Project structure

```
features/                         # Gherkin layer (WHAT is tested)
├── <area>/*.feature              # Scenarios, tagged by area, @smoke and @slow
├── step-definitions/             # Translate Gherkin into Tasks and Questions
│   └── common.steps.ts           # Shared login, status, header and body assertions
└── support/
    ├── serenity.config.ts        # Actors, reporters and timeouts
    ├── hooks.ts                  # Resets the API before every scenario
    ├── parameter-types.ts        # {actor}, {value}, {method}, {transition}
    └── values.ts                 # Data-table and literal parsing
src/
├── api/
│   ├── schema.d.ts               # Generated from the OpenAPI contract (do not edit)
│   └── types.ts                  # Friendly aliases for the generated schemas
├── config/environment.ts         # Base URL, API key and timeouts (environment variables)
└── screenplay/                   # Screenplay layer (HOW it is tested)
    ├── abilities/UseCredentials.ts   # A persona's seed credentials
    ├── actors/                       # The Cast and the personas
    ├── interactions/Request.ts       # Low-level HTTP interactions
    ├── notes/ApiNotes.ts             # What actors remember between steps (tokens, ETags, ids)
    ├── questions/                    # Response fields and headers
    └── tasks/                        # Business tasks per API area
```

## The Screenplay Pattern in this project

- **Actor**: who interacts with the system (Ada, Carl, Vera, guests).
- **Ability**: what an actor *can* do: `CallAnApi` (HTTP), `TakeNotes` (remember values) and `UseCredentials`.
- **Interaction**: low-level actions such as `Request.post('/movements', body)`.
- **Task**: business activities built from interactions, e.g. `Authenticate.withBearerToken()`,
  `Stock.adjust(...)` or `PurchaseOrders.transition(id, 'receive')`.
- **Question**: retrieves the state of the system, e.g. `LastResponse.status()`, `ResponseField.at('items.0.sku')`
  or `ResponseHeader.called('ETag')`.

Step definitions only connect Gherkin with Tasks and Questions; the reusable logic lives in `src/screenplay`.

## Continuous integration

`.github/workflows/api-tests.yml` starts the Prop Room API as a service container, runs the type check and every
scenario, then publishes the Serenity BDD report as a build artifact. If the runner cannot pull the image, make the
GHCR package public or add a `docker/login-action` step.

## Environment variables

| Variable | Default |
| --- | --- |
| `API_BASE_URL` | `http://localhost:8000` |
| `API_KEY` | `test-api-key-123` |
| `API_TIMEOUT_MS` | `10000` |
