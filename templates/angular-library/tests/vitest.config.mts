import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// the AXE checks of the stories, against the storybook "npm test" builds before. The unit tests of the components run
// with "ng test"
export default defineConfig({
    test: {
        root: fileURLToPath(new URL('..', import.meta.url)),
        include: ['tests/accessibility.spec.ts'],
        testTimeout: 60_000
    }
});
