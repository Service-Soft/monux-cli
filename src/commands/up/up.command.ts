import { CPUtilities } from '../../encapsulation';
import { runPrepare } from '../prepare';

/**
 * Starts up the docker compose service.
 */
export async function runUp(): Promise<void> {
    await runPrepare('docker-compose.yaml');
    CPUtilities.execSync('docker compose up --build -d');
}