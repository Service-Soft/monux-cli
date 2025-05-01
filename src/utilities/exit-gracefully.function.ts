import { finished } from 'node:stream/promises';

/**
 * Exits the process gracefully.
 * @param code - The exit code.
 * @returns Never, as this will close the process.
 */
export async function exitGracefully(code: number): Promise<never> {
    process.exitCode = code;
    try {
        await Promise.all([
            finished(process.stdout, { writable: true }),
            finished(process.stderr, { writable: true })
        ]);
    }
    finally {
        return process.exit(code);
    }
}