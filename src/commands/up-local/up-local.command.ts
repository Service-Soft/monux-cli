import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { CPUtilities } from '../../encapsulation';
import { runPrepare } from '../prepare';

/**
 * Starts up the docker compose service.
 */
export async function runUpLocal(): Promise<void> {
    await runPrepare();
    CPUtilities.execSync(`docker compose -f ${LOCAL_DOCKER_COMPOSE_FILE_NAME} up --build`);
}