import { DockerLabel } from '../../docker';
import { WorkspaceConfig } from '../../workspace';

/**
 * Represents a Docker container's information as returned by
 * `docker ps --format '{{json .}}'`. Each property corresponds
 * to a field in the Docker CLI output.
 */
export interface StringifiedDockerService {
    /**
     * The command that was used to start the container,
     * including any arguments. This is typically a string
     * representation of the command line.
     */
    Command: string,
    /**
     * The timestamp indicating when the container was created,
     * formatted as a human-readable string.
     */
    CreatedAt: string,
    /**
     * The name of the image used to create the container,
     * including the tag (e.g., 'node:latest').
     */
    Image: string,
    /**
     * A comma-separated string of labels assigned to the container.
     * Each label is a key-value pair (e.g., 'key1=value1,key2=value2').
     */
    Labels: string,
    /**
     * The number of local volumes attached to the container,
     * represented as a string (e.g., '0', '1').
     */
    LocalVolumes: string,
    /**
     * A comma-separated list of mount points used by the container,
     * such as volumes or bind mounts.
     */
    Mounts: string,
    /**
     * The name(s) assigned to the container. In most cases,
     * this will be a single name, but multiple names can be
     * present if the container is part of a service.
     */
    Names: string,
    /**
     * A comma-separated list of networks the container is connected to.
     */
    Networks: string,
    /**
     * A comma-separated list of ports exposed by the container,
     * along with their mappings (e.g., '0.0.0.0:80->80/tcp').
     */
    Ports: string,
    /**
     * A human-readable string indicating how long the container
     * has been running (e.g., '5 minutes ago').
     */
    RunningFor: string,
    /**
     * The current state of the container (e.g., 'running', 'exited').
     */
    State: string,
    /**
     * A descriptive status message for the container, including
     * its state and uptime (e.g., 'Up 5 minutes').
     */
    Status: string
}

/**
 * Same as @StringifiedDockerService, but with parsed labels and an optional workspace config.
 */
export interface StringifiedDockerServiceWithParsedLabels extends Omit<StringifiedDockerService, 'Labels'> {
    /**
     * The parsed labels.
     */
    Labels: Record<DockerLabel, string | undefined>,
    /**
     * The workspace config, if found.
     */
    config: WorkspaceConfig | undefined
}

/**
 * A fully parsed docker service that is part of a Monux monorepo.
 */
export interface FullyParsedDockerService extends StringifiedDockerServiceWithParsedLabels {
    /**
     * The configuration of the monorepo.
     */
    config: WorkspaceConfig
}

/**
 * Type guard that checks if the given service is fully parsed.
 * @param service - The service to check.
 * @returns True when there is a workspace config on the service, false otherwise.
 */
export function isFullyParsedDockerService(service: StringifiedDockerServiceWithParsedLabels): service is FullyParsedDockerService {
    return service.config != undefined;
}