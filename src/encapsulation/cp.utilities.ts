import { execSync, ExecSyncOptions } from 'child_process';

import { ChalkUtilities } from './chalk.utilities';
import { exitGracefully, exitWithInterrupt, isErrorWithSignal, isExitPromptError } from '../utilities';

/**
 * Encapsulates functionality of the child_process package.
 */
export abstract class CPUtilities {

    /**
     * Used only for testing/mocking.
     */
    // eslint-disable-next-line typescript/prefer-readonly
    private static cwd?: string;

    /**
     * Executes a command and waits for its execution.
     * @param command - The command to run.
     * @param output - Whether or not the output of the command should be passed to the console.
     * @throws When there was an error during execution.
     */
    static async exec(command: string, output: boolean = true): Promise<void> {
        const options: ExecSyncOptions = {
            stdio: output ? 'inherit' : undefined,
            killSignal: 'SIGINT',
            cwd: this.cwd
        };
        try {
            execSync(command, options);
        }
        catch (error) {
            if (isExitPromptError(error) || (isErrorWithSignal(error) && error.signal === 'SIGINT')) {
                await exitWithInterrupt();
            }
            // eslint-disable-next-line no-console
            console.error(ChalkUtilities.error(`Command failed: ${command}`));
            await exitGracefully(1);
        }
    }
}