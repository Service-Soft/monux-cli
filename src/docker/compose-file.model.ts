import { KeyValue } from '../types';

/**
 * Definition of a complete docker compose file.
 */
export type ComposeDefinition = {
    /**
     * The services of the docker compose file.
     */
    services: ComposeService[],
    /**
     * Any specific volumes for eg. The database.
     */
    volumes: string[],
    /**
     * Any specific networks.
     */
    networks: string[]
};

/**
 * Definition for a service in a docker compose file.
 */
export type ComposeService = {
    /**
     * The name of the service.
     */
    name: string,
    /**
     * The command options for the service.
     */
    command?: string[],
    /**
     * The ports definition of the service.
     */
    ports?: ComposePort[],
    /**
     * The volumes that are used by the service.
     */
    volumes?: ComposeServiceVolume[],
    /**
     * The image that the service is build upon.
     * See "build" if you don't depend on an image.
     */
    image?: string,
    /**
     * The docker build file that is used to build an image of the service.
     * See "image" if you want to use a preexisting image.
     */
    build?: ComposeBuild,
    /**
     * The networks that the service uses.
     */
    networks?: string[],
    /**
     * Environment variables to be used by the service.
     */
    environment?: ComposeServiceEnvironment,
    /**
     * The labels to use on the service.
     */
    labels?: string[]
};

/**
 * Definition of a port from a docker compose service.
 */
export type ComposePort = number | {
    /**
     * The internal port.
     */
    internal: number,
    /**
     * The exposed, external port.
     */
    external: number
};

/**
 * Type of a docker services environment variables.
 */
export type ComposeServiceEnvironment = KeyValue<string>[];

/**
 * Definition for a docker services "build" variable.
 * Can either be a relative path to a folder with a Dockerfile, or an object for more fine grained configuration.
 */
export type ComposeBuild = string | {
    /**
     * The dockerfile to use for the build.
     */
    dockerfile: string,
    /**
     * The context to provide when building from the dockerfile.
     */
    context: string
};

/**
 * Definition for a volume that is used by a service.
 * Consists of the path and an optional mount.
 */
export type ComposeServiceVolume = {
    /**
     * The volumes path.
     * Supports relative paths, docker default volumes as well as volumes defined in the volumes section of the docker compose file.
     */
    path: string,
    /**
     * Where the data of the volume should be mounted.
     * Can be empty.
     */
    mount?: string
};