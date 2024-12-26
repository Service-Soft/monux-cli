import { execSync, ExecSyncOptions } from 'child_process';

import { ChalkUtilities } from './chalk.utilities';

/**
 * Encapsulates functionality of the child_process package.
 */
export abstract class CPUtilities {

    // eslint-disable-next-line typescript/prefer-readonly
    private static cwd?: string;

    /**
     * Executes a command and waits for its execution.
     * @param command - The command to run.
     * @param output - Whether or not the output of the command should be passed to the console.
     * @throws When there was an error during execution.
     */
    static execSync(command: string, output: boolean = true): void {
        const options: ExecSyncOptions = {
            stdio: output ? 'inherit' : undefined,
            killSignal: 'SIGINT',
            cwd: this.cwd
        };
        try {
            execSync(command, options);
        }
        catch (error) {
            if (this.isErrorWithSignal(error) && error.signal === 'SIGINT') {
                // eslint-disable-next-line no-console
                console.log(ChalkUtilities.secondary('\nProcess interrupted (Ctrl+C)'));
                process.exit(130);
            }
            else {
                throw error;
            }
        }
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    private static isErrorWithSignal(error: unknown): error is { signal: string } {
        return typeof error === 'object' && error !== null && 'signal' in error;
    }
}