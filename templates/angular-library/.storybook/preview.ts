import { Preview } from '@storybook/angular';

import { PAGE_LEVEL_RULES } from './page-level-rules';

// whether the app runs on a server, which the angular cli defines in every bundle, but storybook's webpack doesn't.
// Angular reads it unguarded, so every story would throw a ReferenceError in a production build
globalThis.ngServerMode ??= false;

const preview: Preview = {
    parameters: {
        a11y: {
            // every story has to pass all AXE checks
            test: 'error',
            config: { rules: PAGE_LEVEL_RULES.map(id => ({ id, enabled: false })) }
        }
    },
    globalTypes: {
        theme: {
            description: 'Light or dark mode',
            toolbar: { title: 'Theme', icon: 'mirror', items: ['system', 'light', 'dark'], dynamicTitle: true }
        }
    },
    initialGlobals: {
        theme: 'system'
    },
    decorators: [
        // the classes of @service-soft/ui that fix the mode, system leaves the choice to the operating system
        (story, context) => {
            const theme: unknown = context.globals['theme'];
            document.documentElement.classList.toggle('light', theme === 'light');
            document.documentElement.classList.toggle('dark', theme === 'dark');
            return story();
        }
    ]
};
export default preview;
