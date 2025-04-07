import { ChalkUtilities } from '../encapsulation';

/**
 * Exits the cli when an interrupt occurs.
 * @returns Never, as the program stops when this function finished running.
 */
export function exitWithInterrupt(): never {
    // eslint-disable-next-line no-console
    console.log(ChalkUtilities.secondary('\nProcess interrupted (Ctrl+C)'));
    return process.exit(130);
}