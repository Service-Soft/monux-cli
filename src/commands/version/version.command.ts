/* eslint-disable no-console */
import { ChalkUtilities } from '../../encapsulation';

/**
 * Runs the version cli command.
 */
export function runVersion(): void {
    console.log(ChalkUtilities.boldUnderline('Version:'));
    console.log(ChalkUtilities.secondary(process.env['npm_package_version'] as string));
}