import { CPUtilities } from '../encapsulation';
import { Path } from '../utilities';

/**
 * Handles functionality around storybook.
 */
export abstract class StorybookUtilities {

    private static readonly CLI_VERSION: number = 8;

    /**
     * Sets up storybook inside the given root.
     * @param root - The root of the project where storybook should be setup.
     */
    static setup(root: Path): void {
        CPUtilities.execSync(
            `cd ${root} && npm create storybook@${this.CLI_VERSION} -- --no-dev --yes --features docs test --disable-telemetry`
        );
    }
}