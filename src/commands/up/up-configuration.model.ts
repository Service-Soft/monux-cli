import { DockerComposeFileName } from '../../docker';

/**
 * Configuration for the up command.
 */
export type UpConfiguration = {
    /**
     * Which docker compose file to use.
     * Is relevant to determine the environment t.
     */
    fileName: DockerComposeFileName,
    /**
     * This needs to be optional, to run the command locally before the services are registered with docker.
     */
    dockerFilePath: string | undefined,
    /**
     * The name of the monorepo project.
     */
    projectName: string,
    /**
     * The root dir of the monorepo project.
     */
    rootDir: string
};