import { DockerComposeFileName } from '../docker';

/**
 * The possible environment values.
 */
export enum EnvValue {
    DEV = 'dev',
    LOCAL = 'local',
    STAGE = 'stage',
    PROD = 'prod'
}

/**
 * The environment value for the given docker compose file name.
 */
export const envValueForDockerComposeFileName: Record<DockerComposeFileName, EnvValue> = {
    'docker-compose.yaml': EnvValue.PROD,
    'dev.docker-compose.yaml': EnvValue.DEV,
    'local.docker-compose.yaml': EnvValue.LOCAL,
    'stage.docker-compose.yaml': EnvValue.STAGE
};