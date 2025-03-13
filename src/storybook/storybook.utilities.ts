import { CPUtilities } from '../encapsulation';

/**
 * Handles functionality around storybook.
 */
export abstract class StorybookUtilities {
    /**
     * Sets up storybook inside the given root.
     * @param root - The root of the project where storybook should be setup.
     */
    static setup(root: string): void {
        CPUtilities.execSync(`cd ${root} && npm create storybook@latest --yes --features docs test --disable-telemetry`);
    }
}