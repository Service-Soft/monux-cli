import { CPUtilities } from '../../encapsulation';

/**
 * Shuts down the monorepo.
 */
export function runDown(): void {
    CPUtilities.execSync('docker compose down');
}