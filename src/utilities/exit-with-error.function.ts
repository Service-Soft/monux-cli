import { MORE_INFORMATION_MESSAGE } from '../constants';
import { ChalkUtilities } from '../encapsulation';

/**
 * Exits the cli with the given error message.
 * @param message - The message/reason to display when exiting.
 * @returns Never, as the program stops when this function finished running.
 */
export function exitWithError(message: string): never {
    // eslint-disable-next-line no-console
    console.error(ChalkUtilities.error(message));
    // eslint-disable-next-line no-console
    console.log(MORE_INFORMATION_MESSAGE);
    return process.exit(0);
}