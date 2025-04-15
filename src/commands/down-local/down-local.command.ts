import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { CPUtilities } from '../../encapsulation';

/**
 * Shuts down the local services.
 */
export function runDownLocal(): void {
    CPUtilities.execSync(`docker compose -f ${LOCAL_DOCKER_COMPOSE_FILE_NAME} stop`);
}