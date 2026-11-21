/* eslint-disable no-console */
import { ChalkUtilities } from './chalk.utilities';

/**
 * Everything Monux shows the user goes through here, so every command looks the same.
 * The only place that uses the console.
 */
export abstract class LogUtilities {
    /**
     * Announces a step the user would recognize, in the -ing form: "Creating the Angular workspace".
     * @param message - What Monux is doing.
     */
    static step(message: string): void {
        console.log(ChalkUtilities.secondary(message));
    }

    /**
     * Reports what happened and where: 'Added "admin" in apps/admin'.
     * @param message - The result.
     */
    static success(message: string): void {
        console.log(ChalkUtilities.success(message));
    }

    /**
     * Reports something the user should know, but which does not stop Monux.
     * @param message - The warning.
     */
    static warning(message: string): void {
        console.warn(ChalkUtilities.warning(message));
    }

    /**
     * Reports what went wrong. Followed by what the user can do about it.
     * @param message - The error.
     */
    static error(message: string): void {
        console.error(ChalkUtilities.error(message));
    }

    /**
     * Shows a heading, such as above a table or a list of commands.
     * @param title - The heading.
     */
    static heading(title: string): void {
        console.log(ChalkUtilities.boldUnderline(title));
    }

    /**
     * Shows plain text, one line per value.
     * @param lines - The lines to show.
     */
    static text(...lines: string[]): void {
        for (const line of lines) {
            console.log(line);
        }
    }

    /**
     * Shows an empty line.
     */
    static newLine(): void {
        console.log();
    }
}