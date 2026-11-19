import { exec, execSync, ExecSyncOptions } from 'node:child_process';
import { promisify } from 'node:util';

import { LogUtilities } from './log.utilities';
import { ProcessUtilities } from './process.utilities';

/**
 * The output of a command that ran, as exec resolves it.
 */
type ExecResult = {
    /**
     * What the command wrote to stdout.
     */
    stdout: string,
    /**
     * What the command wrote to stderr.
     */
    stderr: string
};

/**
 * How a command runs that is not waited for synchronously.
 */
type ExecOptions = {
    /**
     * The directory the command runs in.
     */
    cwd?: string,
    /**
     * How many bytes the command may write to stdout or stderr.
     */
    maxBuffer: number,
    /**
     * After how many milliseconds the command is stopped.
     */
    timeout?: number
};

const execAsync: (command: string, options: ExecOptions) => Promise<ExecResult> = promisify(exec);

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
     * Monux keeps running meanwhile, so a process it talks to, like a browser, is not left waiting for it.
     * @param command - The command to run.
     * @param timeoutInMs - How long the command may take before it is stopped. Unlimited by default.
     * @returns The output of the command, trimmed.
     * @throws When there was an error during execution, or the command took longer than it may.
     */
    static async resolveOutput(command: string, timeoutInMs?: number): Promise<string> {
        try {
            // what a command like lighthouse writes, a json report of several megabytes, fits
            const result: ExecResult = await execAsync(command, { cwd: this.cwd, maxBuffer: 256 * 1024 * 1024, timeout: timeoutInMs });
            return result.stdout.trim();
        }
        catch (error) {
            if (ProcessUtilities.isInterrupt(error)) {
                return await ProcessUtilities.exitWithInterrupt();
            }
            LogUtilities.error(`Command failed: ${command}`);
            throw error;
        }
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