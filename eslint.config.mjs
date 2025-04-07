import { configs } from 'eslint-config-service-soft';

/** @type {import('eslint').Linter.Config} */
export default [
    ...configs,
    {
        ignores: ['src/__testing__/tmp/*', 'src/__testing__/coverage/*', 'sandbox']
    }
];