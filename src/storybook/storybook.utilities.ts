import { CPUtilities } from '../encapsulation';

/**
 *
 */
export abstract class StorybookUtilities {
    /**
     *
     */
    static setup(root: string): void {
        CPUtilities.execSync(`cd ${root} && npm create storybook@latest --yes --features docs test --disable-telemetry`);
    }
}