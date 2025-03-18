import chalk from 'chalk';

const COLOR_PRIMARY: string = '#37517e';
const COLOR_SECONDARY: string = '#47b2e4';

/**
 * Encapsulates functionality of the chalk package.
 */
export abstract class ChalkUtilities {

    /**
     * Used to log something in the primary color.
     * @param value - The value that should be logged in the primary color.
     * @returns The string to log.
     */
    static primary(...value: string[]): string {
        return chalk.hex(COLOR_PRIMARY)(value);
    }

    /**
     * Used to log something in the secondary color.
     * @param value - The value that should be logged in the secondary color.
     * @returns The string to log.
     */
    static secondary(...value: string[]): string {
        return chalk.hex(COLOR_SECONDARY)(value);
    }

    /**
     * Used to log errors in red.
     * @param value - The value that should be logged as an error.
     * @returns The string to log.
     */
    static error(...value: string[]): string {
        return chalk.red(value);
    }

    /**
     * Used to log something in bold and underlined.
     * @param value - The value that should be logged bold and underlined.
     * @returns The string to log.
     */
    static boldUnderline(...value: string[]): string {
        return chalk.underline.bold(value);
    }

    /**
     * Defines how an example usage of the cli should be formatted.
     * @param value - The value to log.
     * @returns The value in italic with primary color.
     */
    static exampleUsage(...value: string[]): string {
        return chalk.italic.hex(COLOR_PRIMARY)(value);
    }
}