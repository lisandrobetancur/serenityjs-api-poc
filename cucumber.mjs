// Cucumber.js + Serenity/JS configuration.
// https://serenity-js.org/handbook/test-runners/cucumber/
//
// Scenarios are filtered ONLY with a Cucumber tag expression in the TAGS environment variable:
//   TAGS='@smoke and not @slow' npm test
// See scripts/run-tests.ts for why other filtering mechanisms are rejected.

const tags = process.env.TAGS ?? '';

const common = {
    requireModule: ['tsx/cjs'],
    require: [
        'features/config/**/*.ts',
        'features/support/**/*.ts',
        'features/hooks/index.ts',
        'features/definitions/**/*.ts',
    ],
    format: ['@serenity-js/cucumber'],
    formatOptions: { specDirectory: 'features' },
    ...(tags ? { tags } : {}),
};

export default common;
