import yaml from 'js-yaml';

import { DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { ComposeBuild, ComposeDefinition, ComposePort, ComposeService, ComposeServiceEnvironment, ComposeServiceVolume } from './compose-file.model';
import { EnvUtilities } from '../env';
import { OmitStrict } from '../types';
import { toSnakeCase } from '../utilities/to-snake-case.function';

// eslint-disable-next-line jsdoc/require-jsdoc
type ParsedDockerComposeEnvironment = { [key: string]: string } | string[];

// eslint-disable-next-line jsdoc/require-jsdoc
type ParsedDockerComposeServiceNetwork = string[] | Record<string, unknown>;

// eslint-disable-next-line jsdoc/require-jsdoc
type ParsedDockerComposeService = OmitStrict<ComposeService, 'volumes' | 'environment' | 'networks' | 'ports'> & {
    // eslint-disable-next-line jsdoc/require-jsdoc
    volumes?: string[],
    // eslint-disable-next-line jsdoc/require-jsdoc
    environment?: ParsedDockerComposeEnvironment,
    // eslint-disable-next-line jsdoc/require-jsdoc
    networks?: ParsedDockerComposeServiceNetwork,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ports?: string[]
};

// eslint-disable-next-line jsdoc/require-jsdoc
type ParsedDockerCompose = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    version?: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    services?: {
        [serviceName: string]: ParsedDockerComposeService
    },
    // eslint-disable-next-line jsdoc/require-jsdoc
    volumes?: {
        [volumeName: string]: unknown
    },
    // eslint-disable-next-line jsdoc/require-jsdoc
    networks?: {
        [networkName: string]: unknown
    }
};

/**
 * Utilities for docker specific code generation/manipulation.
 */
export abstract class DockerUtilities {

    /**
     * Gets the docker compose labels for usage with the traefik reverse proxy.
     * @param projectName - The name of the project to get the labels for.
     * @returns The docker compose traefik labels as an string array.
     */
    static getTraefikLabels(projectName: string): string[] {
        const environmentVariable: string = `${toSnakeCase(projectName)}_domain`;
        return [
            'traefik.enable=true',
            `traefik.http.routers.whoami.rule=Host(\`\${${environmentVariable}}\`)`,
            'traefik.http.routers.whoami.entrypoints=websecure',
            'traefik.http.routers.whoami.tls.certresolver=myresolver'
        ];
    }

    /**
     * Creates an empty docker compose file at the given path.
     * @param email - The email that should be used for the letsencrypt certificate.
     * @param path - The path of where to create the file.
     * Defaults to "docker-compose.yaml" (which creates the file in the current directory).
     */
    static async createDockerCompose(email: string, path: string = DOCKER_COMPOSE_FILE_NAME): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: 'traefik:v3.2',
                    name: 'traefik',
                    command: [
                        // '--api.insecure=true'
                        '--providers.docker=true',
                        '--providers.docker.exposedbydefault=false',
                        '--entryPoints.web.address=:80',
                        '--entryPoints.websecure.address=:443',
                        '--certificatesresolvers.myresolver.acme.httpchallenge=true',
                        '--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web',
                        `--certificatesresolvers.myresolver.acme.email=${email}`,
                        '--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json'
                    ],
                    ports: [
                        {
                            internal: 80,
                            external: 80
                        },
                        {
                            internal: 443,
                            external: 443
                        }
                    ],
                    volumes: [
                        {
                            path: './letsencrypt',
                            mount: '/letsencrypt'
                        },
                        {
                            path: '/var/run/docker.sock',
                            mount: '/var/run/docker.sock:ro'
                        }
                    ],
                    labels: []
                }
            ],
            volumes: [],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(path, yaml);
    }

    /**
     * Adds the given compose service to the docker-compose.yaml.
     * @param service - The definition of the service to add.
     * @param domain - The domain of the service. Optional.
     * @param composePath - The path of the compose file.
     * Defaults to "docker-compose.yaml" (which creates the file in the current directory).
     */
    static async addServiceToCompose(
        service: ComposeService,
        domain?: string,
        composePath: string = DOCKER_COMPOSE_FILE_NAME
    ): Promise<void> {
        const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);
        definition.services.push(service);
        await FsUtilities.updateFile(composePath, this.composeDefinitionToYaml(definition), 'replace');
        if (domain) {
            await EnvUtilities.addVariable({ key: `${toSnakeCase(service.name)}_domain`, value: domain, required: true, type: 'string' });
        }
    }

    private static composeDefinitionToYaml(definition: ComposeDefinition): string[] {
        return [
            ...this.getServiceSection(definition.services),
            ...this.getVolumeSection(definition.volumes),
            ...this.getNetworkSection(definition.networks)
        ];
    }

    private static getServiceSection(services: ComposeService[]): string[] {
        if (!services.length) {
            return [];
        }

        return ['services:', ...services.map(s => this.getService(s))];
    }

    private static getVolumeSection(volumes: string[]): string[] {
        if (!volumes.length) {
            return [];
        }

        return ['', 'volumes:', ...volumes.map(v => `\t${v}:`)];
    }

    private static getNetworkSection(networks: string[]): string[] {
        if (!networks.length) {
            return [];
        }

        return ['', 'networks:', ...networks.map(n => `\t${n}:`)];
    }

    private static getService(service: ComposeService): string {
        return [
            '',
            `\t${service.name}:`,
            ...this.getServiceImageSection(service.image),
            ...this.getServiceBuildSection(service.build),
            '\t\trestart: unless-stopped',
            ...this.getServiceCommandSection(service.command),
            ...this.getServicePortsSection(service.ports),
            ...this.getServiceVolumesSection(service.volumes),
            ...this.getServiceEnvironmentSection(service.environment),
            ...this.getServiceNetworksSection(service.networks),
            ...this.getServiceLabelsSection(service.labels)
        ].join('\n');
    }

    private static getServiceLabelsSection(labels: string[] | undefined): string[] {
        if (!labels?.length) {
            return [];
        }

        return ['\t\tlabels:', ...labels.map(l => `\t\t\t- ${l}`)];
    }

    private static getServicePortsSection(ports: ComposePort[] | undefined): string[] {
        if (!ports?.length) {
            return [];
        }

        return [
            '\t\tports:',
            ...ports.map(p => {
                if (typeof p === 'number') {
                    return `\t\t\t- ${p}`;
                }
                return `\t\t\t- ${p.external}:${p.internal}`;
            })
        ];
    }

    private static getServiceCommandSection(command: string[] | undefined): string[] {
        if (command == undefined) {
            return [];
        }
        return ['\t\tcommand:', ...command.map(e => `\t\t\t- ${e}`)];
    }

    private static getServiceEnvironmentSection(environment: ComposeServiceEnvironment | undefined): string[] {
        if (!environment?.length) {
            return [];
        }
        return ['\t\tenvironment:', ...environment.map(e => `\t\t\t${e.key}: ${e.value}`)];
    }

    private static getServiceBuildSection(build: ComposeBuild | undefined): string[] {
        if (build == undefined) {
            return [];
        }

        if (typeof build === 'string') {
            return [`\t\tbuild: ${build}`];
        }
        return [
            '\t\tbuild:',
            `\t\t\tdockerfile: ${build.dockerfile}`,
            `\t\t\tcontext: ${build.context}`
        ];
    }

    private static getServiceImageSection(image: string | undefined): string[] {
        if (image == undefined) {
            return [];
        }

        return [`\t\timage: ${image}`];
    }

    private static getServiceNetworksSection(networks: string[] | undefined): string[] {
        if (!networks?.length) {
            return [];
        }

        return ['\t\tnetworks:', ...networks.map(n => `\t\t\t${n}:`)];
    }

    private static getServiceVolumesSection(volumes: ComposeServiceVolume[] | undefined): string[] {
        if (!volumes?.length) {
            return [];
        }

        return [
            '\t\tvolumes:',
            ...volumes.map(v => {
                const mount: string = v.mount ? `:${v.mount}` : '';
                return `\t\t\t- ${v.path}${mount}`;
            })
        ];
    }

    private static async yamlToComposeDefinition(composePath: string): Promise<ComposeDefinition> {
        // Load the YAML file
        const fileContent: string = await FsUtilities.readFile(composePath);
        const parsedYaml: ParsedDockerCompose | undefined = yaml.load(fileContent) as ParsedDockerCompose | undefined;

        // Transform YAML into ComposeDefinition
        const services: ComposeService[] = Object.entries(parsedYaml?.services ?? {})
            .map(([serviceName, serviceData]: [string, ParsedDockerComposeService]) => {
                const res: ComposeService = {
                    name: serviceName,
                    volumes: this.parseServiceVolumes(serviceData.volumes),
                    command: serviceData.command,
                    image: serviceData.image,
                    build: this.parseBuild(serviceData.build),
                    networks: this.parseServiceNetworks(serviceData.networks),
                    environment: this.parseEnvironment(serviceData.environment),
                    ports: this.parsePorts(serviceData.ports),
                    labels: serviceData.labels
                };
                return res;
            });

        return {
            services,
            volumes: Object.keys(parsedYaml?.volumes ?? {}),
            networks: Object.keys(parsedYaml?.networks ?? {})
        };
    }

    private static parsePorts(ports: string[] | undefined): ComposePort[] | undefined {
        if (ports == undefined) {
            return;
        }
        return ports?.map((p: string) => this.parseServicePort(p));
    }

    private static parseServicePort(portStr: string): ComposePort {
        const [external, internal] = portStr.split(':').map(Number);
        return { internal: internal ?? external, external };
    }

    private static parseServiceNetworks(networks: ParsedDockerComposeServiceNetwork | undefined): string[] | undefined {
        if (networks == undefined) {
            return;
        }
        return Array.isArray(networks) ? networks : Object.keys(networks);
    }

    private static parseServiceVolumes(volumes: string[] | undefined): ComposeServiceVolume[] | undefined {
        if (volumes == undefined) {
            return;
        }
        return volumes?.map((v: string) => this.parseServiceVolume(v));
    }

    private static parseServiceVolume(volumeStr: string): ComposeServiceVolume {
        const [path, ...mount] = volumeStr.split(':');
        return { path, mount: mount.join('') };
    }

    private static parseBuild(build: ComposeBuild | undefined): ComposeBuild | undefined {
        if (build == undefined) {
            return;
        }
        if (typeof build === 'string') {
            return build;
        }
        return {
            dockerfile: build.dockerfile,
            context: build.context
        };
    }

    private static parseEnvironment(env: ParsedDockerComposeEnvironment | undefined): ComposeServiceEnvironment | undefined {
        if (env == undefined) {
            return;
        }
        if (Array.isArray(env)) {
            // If environment is an array, convert to key-value pairs
            return env.map((e: string) => {
                const [key, ...value] = e.split('=');
                return { key, value: value.join('') };
            });
        }
        // If environment is an object, convert it to key-value pairs
        return Object.entries(env).map(([key, value]) => ({ key, value: value }));
    }
}