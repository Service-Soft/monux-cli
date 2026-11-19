import { execSync, ExecSyncOptions } from 'node:child_process';

import { LogUtilities } from './log.utilities';
import { ProcessUtilities } from './process.utilities';

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
        await this.execSync(command, { stdio: output ? 'inherit' : undefined });
    }

    /**
     * Executes a command and resolves what it wrote to stdout.
     * @param command - The command to run.
     * @returns The output of the command, trimmed.
     * @throws When there was an error during execution.
     */
    static async resolveOutput(command: string): Promise<string> {
        const output: Buffer | string = await this.execSync(command, { stdio: 'pipe' });
        return output.toString().trim();
    }

    private static async execSync(command: string, options: ExecSyncOptions): Promise<Buffer | string> {
        try {
            return execSync(command, { ...options, killSignal: 'SIGINT', cwd: this.cwd });
        }
        catch (error) {
            if (ProcessUtilities.isInterrupt(error)) {
                return await ProcessUtilities.exitWithInterrupt();
            }
            LogUtilities.error(`Command failed: ${command}`);
            throw error;
        }
    }
}