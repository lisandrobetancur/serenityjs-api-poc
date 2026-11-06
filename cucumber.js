// Cucumber.js + Serenity/JS configuration
// https://serenity-js.org/handbook/test-runners/cucumber/
module.exports = {
    default: {
        requireModule: ['tsx/cjs'],
        require: [
            'features/support/**/*.ts',
            'features/step-definitions/**/*.ts',
        ],
        format: ['@serenity-js/cucumber'],
        formatOptions: {
            specDirectory: 'features',
        },
    },
};
