
/**
 * Checks if the given error has a signal like SIGINT, etc.
 * @param error - The error to check.
 * @returns True when the error has a 'signal' key, false otherwise.
 */
// eslint-disable-next-line jsdoc/require-jsdoc
export function isErrorWithSignal(error: unknown): error is { signal: string } {
    return typeof error === 'object' && error !== null && 'signal' in error;
}