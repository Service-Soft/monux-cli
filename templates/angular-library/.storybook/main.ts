import { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
    // the stories next to each component, which `npm test` checks with AXE
    stories: ['../**/*.stories.ts'],
    addons: ['@storybook/addon-a11y'],
    // no usage data of the developers of the workspace leaves their machines
    core: { disableTelemetry: true },
    framework: {
        name: '@storybook/angular',
        options: {}
    }
};
export default config;
