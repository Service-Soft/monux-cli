import { MORE_INFORMATION_MESSAGE } from '../constants';

/**
 *
 * @param message
 */
export function exitWithError(message: string): void {
    // eslint-disable-next-line no-console
    console.error(message);
    // eslint-disable-next-line no-console
    console.log(MORE_INFORMATION_MESSAGE);
    process.exit(0);
}