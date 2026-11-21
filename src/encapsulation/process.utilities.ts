import { finished } from 'node:stream/promises';

import { MORE_INFORMATION_MESSAGE } from '../constants';
import { LogUtilities } from './log.utilities';

/**
 * An error of a process that was ended by a signal, such as SIGINT.
 */
type ErrorWithSignal = {
    /**
     * The signal that ended the process.
     */
    signal: string
};

/**
 * Encapsulates functionality of the node process.
 */
export abstract class ProcessUtilities {
    // what runs before Monux exits with an error or after an interrupt, such as restoring the workspace
    private static readonly exitHandlers: Set<() => Promise<void>> = new Set();

    /**
     * Runs the given handler before Monux exits with an error or after an interrupt, until it is removed.
     * @param handler - What to run, such as restoring the files of the workspace.
     */
    static addExitHandler(handler: () => Promise<void>): void {
        this.exitHandlers.add(handler);
    }

    /**
     * Stops running the given handler before Monux exits.
     * @param handler - The handler that was added.
     */
    static removeExitHandler(handler: () => Promise<void>): void {
        this.exitHandlers.delete(handler);
    }

    /**
     * Exits Monux with the given error message.
     * @param message - The message to show the user, saying what went wrong and what to do about it.
     * @returns Never, as Monux stops.
     */
    static async exitWithError(message: string): Promise<never> {
        LogUtilities.error(message);
        LogUtilities.text(MORE_INFORMATION_MESSAGE);
        await this.runExitHandlers();
        return await this.exitGracefully(1);
    }

    /**
     * Exits Monux after the user interrupted it, such as with Ctrl+C.
     * @returns Never, as Monux stops.
     */
    static async exitWithInterrupt(): Promise<never> {
        LogUtilities.newLine();
        LogUtilities.text('Process interrupted (Ctrl+C)');
        await this.runExitHandlers();
        return await this.exitGracefully(130);
    }

    private static async runExitHandlers(): Promise<void> {
        for (const handler of this.exitHandlers) {
            await handler();
        }
    }

    /**
     * Whether the given error means that the user interrupted Monux, such as with Ctrl+C during a prompt or a command.
     * @param error - The error to check.
     * @returns True when the user interrupted Monux.
     */
    static isInterrupt(error: unknown): boolean {
        return this.isExitPromptError(error) || (this.isErrorWithSignal(error) && error.signal === 'SIGINT');
    }

    private static async exitGracefully(code: number): Promise<never> {
        process.exitCode = code;
        try {
            // what was written to the console reaches the user before the process ends.
            await Promise.all([
                finished(process.stdout, { writable: true }),
                finished(process.stderr, { writable: true })
            ]);
        }
        finally {

            return process.exit(code);
        }
    }

    private static isErrorWithSignal(error: unknown): error is ErrorWithSignal {
        return typeof error === 'object' && error !== null && 'signal' in error;
    }

    private static isExitPromptError(error: unknown): error is Error {
        return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ExitPromptError';
    }
}