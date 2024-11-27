import { execSync, ExecSyncOptions } from 'child_process';

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
     */
    static execSync(command: string, output: boolean = true): void {
        const options: ExecSyncOptions = {
            stdio: output ? 'inherit' : undefined,
            killSignal: 'SIGINT',
            cwd: this.cwd
        };
        execSync(command, options);
    }
}