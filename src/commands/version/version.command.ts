/* eslint-disable no-console */
import { ChalkUtilities } from '../../encapsulation';

/**
 *
 */
export function runVersion(): void {
    console.log(ChalkUtilities.boldUnderline('Version:'));
    console.log(ChalkUtilities.secondary(process.env['npm_package_version'] as string));
}