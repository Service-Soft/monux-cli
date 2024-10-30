import { execSync, ExecSyncOptions } from 'child_process';

import { mockConstants } from '../__testing__';

/**
 * Encapsulates functionality of the child_process package.
 */
export abstract class CPUtilities {
    /**
     * Executes a command and waits for its execution.
     * @param command - The command to run.
     * @param output - Whether or not the output of the command should be passed to the console.
     */
    static execSync(command: string, output: boolean = true): void {
        const options: ExecSyncOptions = {
            stdio: output ? 'inherit' : undefined,
            killSignal: 'SIGINT',
            cwd: process.env['NODE_ENV'] === 'test' ? mockConstants.TMP_DIR : undefined
        };
        execSync(command, options);
    }
}