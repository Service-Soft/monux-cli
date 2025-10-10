// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { configs } from 'eslint-config-service-soft';

// eslint-disable-next-line jsdoc/require-description
/** @type {import('eslint').Linter.Config} */
export default [...configs, {
    ignores: ['src/__testing__/tmp/*', 'src/__testing__/coverage/*', 'sandbox']
}, ...storybook.configs["flat/recommended"]];