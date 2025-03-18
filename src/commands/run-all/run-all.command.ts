import { NpmUtilities } from '../../npm';

/**
 * Runs the run-many cli command.
 * @param npmScript - The npm script to run.
 */
export function runRunAll(npmScript: string): void {
    NpmUtilities.runAll(npmScript);
}