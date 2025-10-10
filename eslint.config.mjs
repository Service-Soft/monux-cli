import { configs } from 'eslint-config-service-soft';

// eslint-disable-next-line jsdoc/require-description
/** @type {import('eslint').Linter.Config} */
export default [
    ...configs,
    {
        ignores: ['src/__testing__/tmp/*', 'src/__testing__/coverage/*', 'sandbox']
    }
];