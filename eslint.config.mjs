import { configs } from '@service-soft/eslint-config';

// eslint-disable-next-line jsdoc/require-description
/** @type {import('eslint').Linter.Config} */
export default [
    ...configs,
    {
        // .claude holds the local settings of whoever works on this repository, not code of it.
        // templates hold placeholders, so they are linted where they end up: in the workspaces the tests generate.
        ignores: ['src/__testing__/tmp/*', 'src/__testing__/coverage/*', 'sandbox', '.claude', 'templates']
    },
    {
        // "__testing__" is where the tests keep what they share. Read as the root of the path below it, so the folders
        // inside are still held to kebab case.
        files: ['**/*.ts'],
        rules: {
            'unicorn/filename-case': ['warn', { directoryRoots: [/(^|\/)__testing__$/u] }]
        }
    }
];