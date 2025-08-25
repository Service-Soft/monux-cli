// eslint-disable-next-line jsdoc/require-jsdoc
export const storybookMainTsContent: string
= `import { join, dirname } from 'path';

import type { StorybookConfig } from '@storybook/angular';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 * @param value - The original value to get the absolute path for.
 * @returns The absolute path.
 */
function getAbsolutePath(value: string): string {
    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-call, typescript/no-unsafe-member-access
    return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [getAbsolutePath('@storybook/addon-docs')],
    framework: {
        name: getAbsolutePath('@storybook/angular'),
        options: {}
    }
};

export default config;`;