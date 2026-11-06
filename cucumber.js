// Configuración de Cucumber.js + Serenity/JS
// https://serenity-js.org/handbook/test-runners/cucumber/
module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        requireModule: ['tsx/cjs'],
        require: [
            'features/support/**/*.ts',
            'features/step-definitions/**/*.ts',
        ],
        format: ['@serenity-js/cucumber'],
        formatOptions: {
            specDirectory: 'features',
        },
        language: 'es',
    },
};
