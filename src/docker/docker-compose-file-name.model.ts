import { DEV_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME } from '../constants';

/**
 * The possible file names of the different docker-compose files Monux provides.
 */
// eslint-disable-next-line stylistic/max-len
export type DockerComposeFileName = typeof PROD_DOCKER_COMPOSE_FILE_NAME | typeof DEV_DOCKER_COMPOSE_FILE_NAME | typeof LOCAL_DOCKER_COMPOSE_FILE_NAME | typeof STAGE_DOCKER_COMPOSE_FILE_NAME;

const dockerComposeFileNameRecord: Record<DockerComposeFileName, DockerComposeFileName> = {
    [DEV_DOCKER_COMPOSE_FILE_NAME]: DEV_DOCKER_COMPOSE_FILE_NAME,
    [PROD_DOCKER_COMPOSE_FILE_NAME]: PROD_DOCKER_COMPOSE_FILE_NAME,
    [LOCAL_DOCKER_COMPOSE_FILE_NAME]: LOCAL_DOCKER_COMPOSE_FILE_NAME,
    [STAGE_DOCKER_COMPOSE_FILE_NAME]: STAGE_DOCKER_COMPOSE_FILE_NAME
};

/**
 * All possible docker compose file names as an array.
 */
export const dockerComposeFileNames: DockerComposeFileName[] = Object.values(dockerComposeFileNameRecord);