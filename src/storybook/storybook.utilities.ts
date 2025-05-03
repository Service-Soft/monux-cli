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
    static async setup(root: Path): Promise<void> {
        await CPUtilities.exec(
            `cd ${root} && npm create storybook@${this.CLI_VERSION} -- --no-dev --yes --features docs test --disable-telemetry`
        );
    }
}