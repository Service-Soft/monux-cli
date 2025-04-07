/**
 * Checks if the given error has a signal like SIGINT, etc.
 * @param error - The error to check.
 * @returns True when the error has a 'signal' key, false otherwise.
 */
export function isExitPromptError(error: unknown): error is Error {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ExitPromptError';
}