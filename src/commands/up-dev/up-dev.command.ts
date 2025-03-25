import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { CPUtilities } from '../../encapsulation';
import { runPrepare } from '../prepare';

/**
 * Starts up the docker compose service.
 */
export async function runUpDev(): Promise<void> {
    await runPrepare('dev.docker-compose.yaml');
    CPUtilities.execSync(`docker compose -f ${DEV_DOCKER_COMPOSE_FILE_NAME} up --build -d`);
}