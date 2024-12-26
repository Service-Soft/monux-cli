import { CPUtilities } from '../../encapsulation';
import { runPrepare } from '../prepare';

/**
 * Starts up the docker compose service.
 */
export async function runUp(): Promise<void> {
    await runPrepare();
    CPUtilities.execSync('docker compose up --build -d');
}