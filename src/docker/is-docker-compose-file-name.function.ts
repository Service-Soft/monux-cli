import { DockerComposeFileName, dockerComposeFileNames } from './docker-compose-file-name.model';

/**
 * Checks whether or not the given string is a docker compose file name.
 * @param value - The value to check.
 * @returns True when the value is included in the known docker compose file names, false otherwise.
 */
export function isDockerComposeFileName(value: string): value is DockerComposeFileName {
    return dockerComposeFileNames.includes(value as DockerComposeFileName);
}