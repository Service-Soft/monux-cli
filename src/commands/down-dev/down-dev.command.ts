import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { CPUtilities } from '../../encapsulation';

/**
 * Shuts down the dev services.
 */
export function runDownDev(): void {
    CPUtilities.execSync(`docker compose -f ${DEV_DOCKER_COMPOSE_FILE_NAME} stop`);
}