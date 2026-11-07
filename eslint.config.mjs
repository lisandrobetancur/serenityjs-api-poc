// ESLint flat config: typescript-eslint recommended rules (type-aware) for src, features and scripts.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['node_modules/**', 'target/**', 'src/models/schema.d.ts'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            // Answers of Serenity/JS questions are often `any` by design (response bodies); keep these as warnings.
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            // String(value) on unknown API data is intentional (report evidence, query parameters).
            '@typescript-eslint/no-base-to-string': 'off',
            // Unions such as 'remembered' | 'none' | string document the special values a parameter accepts.
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
        },
    },
    {
        files: ['**/*.mjs', '**/*.js'],
        ...tseslint.configs.disableTypeChecked,
        languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: globals.node },
    },
);
