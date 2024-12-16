import { CPUtilities } from '../../encapsulation';
import { runBuildEnv } from '../build-env';

/**
 * Starts up the docker compose service.
 */
export async function runUp(): Promise<void> {
    await runBuildEnv();
    CPUtilities.execSync('docker compose up --build -d');
}