import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { CPUtilities } from '../../encapsulation';
import { EnvUtilities } from '../../env';

/**
 * Starts up the docker compose service.
 */
export async function runUpDev(): Promise<void> {
    await EnvUtilities.validate();
    CPUtilities.execSync(`docker compose -f ${DEV_DOCKER_COMPOSE_FILE_NAME} up --build`);
}