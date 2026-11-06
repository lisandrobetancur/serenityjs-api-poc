# serenityjs-api-poc

Proof of concept de pruebas de API REST con [Serenity/JS](https://serenity-js.org), el **patrón Screenplay**, **Cucumber** y **Gherkin** (en español), escrito en TypeScript.

La API de ejemplo es [JSONPlaceholder](https://jsonplaceholder.typicode.com).

## Requisitos

- Node.js >= 20.12 (probado con Node 24)
- Java 17+ (solo para generar el reporte HTML de Serenity BDD)

## Instalación

```bash
npm install
cp .env.example .env   # opcional
```

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm test` | Ejecuta todos los escenarios de Cucumber |
| `npm run test:tags -- "@smoke"` | Ejecuta los escenarios con una etiqueta |
| `npm run lint:types` | Verifica los tipos con TypeScript |
| `npm run serenity:update` | Descarga el CLI de Serenity BDD (una sola vez) |
| `npm run test:report` | Ejecuta las pruebas y genera el reporte HTML en `target/site/serenity` |

## Estructura

```
features/                      # Capa Gherkin (QUÉ se prueba)
├── posts/*.feature            # Escenarios en español (# language: es)
├── step-definitions/          # Traducen Gherkin a Tasks/Questions
└── support/
    ├── serenity.config.ts     # Actores, reporters y timeouts
    └── parameter-types.ts     # {actor} y {pronoun}
src/
├── config/environment.ts      # URL base y timeouts (variables de entorno)
└── screenplay/                # Capa Screenplay (CÓMO se prueba)
    ├── actors/Actors.ts       # Cast: habilidades de cada actor (CallAnApi, TakeNotes)
    ├── tasks/                 # Tareas de negocio (Posts.create, Posts.fetchById…)
    ├── questions/             # Preguntas sobre la respuesta (PostResponse.post…)
    └── models/                # Tipos de los recursos de la API
```

## Patrón Screenplay en este proyecto

- **Actor** — quien interactúa con el sistema (`Ana`, `Bruno` en los escenarios).
- **Ability** — lo que el actor *puede* hacer: `CallAnApi` (HTTP) y `TakeNotes`.
- **Interaction** — acciones de bajo nivel: `Send.a(GetRequest.to(...))`.
- **Task** — agrupan interacciones con significado de negocio: `Posts.create(post)`.
- **Question** — consultan el estado del sistema: `LastResponse.status()`, `PostResponse.post()`.

Los step definitions solo conectan Gherkin con Tasks y Questions; la lógica reutilizable vive en `src/screenplay`.

## Variables de entorno

| Variable | Por defecto |
| --- | --- |
| `API_BASE_URL` | `https://jsonplaceholder.typicode.com` |
| `API_TIMEOUT_MS` | `10000` |
