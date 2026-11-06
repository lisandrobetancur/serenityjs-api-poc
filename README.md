# serenityjs-api-poc

Proof of concept for REST API testing with [Serenity/JS](https://serenity-js.org), the **Screenplay Pattern**, **Cucumber** and **Gherkin**, written in TypeScript.

The example API under test is [JSONPlaceholder](https://jsonplaceholder.typicode.com).

## Requirements

- Node.js >= 20.12 (tested with Node 24)
- Java 17+ (only needed to generate the Serenity BDD HTML report)

## Installation

```bash
npm install
cp .env.example .env   # optional
```

## Commands

| Command | Description |
| --- | --- |
| `npm test` | Run all Cucumber scenarios |
| `npm run test:tags -- "@smoke"` | Run the scenarios matching a tag expression |
| `npm run lint:types` | Type-check the project with TypeScript |
| `npm run serenity:update` | Download the Serenity BDD CLI (once) |
| `npm run test:report` | Run the tests and generate the HTML report in `target/site/serenity` |

## Project structure

```
features/                      # Gherkin layer (WHAT is tested)
├── posts/*.feature            # Scenarios
├── step-definitions/          # Translate Gherkin into Tasks and Questions
└── support/
    ├── serenity.config.ts     # Actors, reporters and timeouts
    └── parameter-types.ts     # {actor} and {pronoun}
src/
├── config/environment.ts      # Base URL and timeouts (environment variables)
└── screenplay/                # Screenplay layer (HOW it is tested)
    ├── actors/Actors.ts       # Cast: the abilities of each actor (CallAnApi, TakeNotes)
    ├── tasks/                 # Business tasks (Posts.create, Posts.fetchById…)
    ├── questions/             # Questions about the response (PostResponse.post…)
    └── models/                # Types of the API resources
```

## The Screenplay Pattern in this project

- **Actor**: who interacts with the system (`Ana` and `Bruno` in the scenarios).
- **Ability**: what the actor *can* do, here `CallAnApi` (HTTP) and `TakeNotes`.
- **Interaction**: low-level actions such as `Send.a(GetRequest.to(...))`.
- **Task**: groups interactions into business-meaningful activities such as `Posts.create(post)`.
- **Question**: retrieves the state of the system, e.g. `LastResponse.status()` or `PostResponse.post()`.

Step definitions only connect Gherkin with Tasks and Questions; the reusable logic lives in `src/screenplay`.

## Environment variables

| Variable | Default |
| --- | --- |
| `API_BASE_URL` | `https://jsonplaceholder.typicode.com` |
| `API_TIMEOUT_MS` | `10000` |
