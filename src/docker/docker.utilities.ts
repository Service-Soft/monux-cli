import yaml from 'js-yaml';

import { DEV_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { ComposeBuild, ComposeDefinition, ComposePort, ComposeService, ComposeServiceEnvironment } from './compose-file.model';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { getPath, Path } from '../utilities';
import { DockerComposeFileName, dockerComposeFileNames } from './docker-compose-file-name.model';
import { DockerTraefikUtilities, TRAEFIK_BASE_DOCKER_COMMANDS, TRAEFIK_DOCKER_IMAGE, TRAEFIK_DOCKER_SOCK_VOLUME } from './docker-traefik.utilities';
import { ParsedDockerCompose, ParsedDockerComposeEnvironment, ParsedDockerComposeService, ParsedDockerComposeServiceNetwork } from './parsed-docker-compose.model';

/**
 * Utilities for docker specific code generation/manipulation.
 */
export abstract class DockerUtilities {

    /**
     * Creates the initial docker compose files at the given path.
     * @param email - The email that should be used for the letsencrypt certificate.
     * Defaults to "" (which creates the file in the current directory).
     */
    static async createComposeFiles(email: string): Promise<void> {
        await Promise.all(
            dockerComposeFileNames.map(async d => {
                switch (d) {
                    case PROD_DOCKER_COMPOSE_FILE_NAME: {
                        await this.createProdDockerCompose(email);
                        return;
                    }
                    case DEV_DOCKER_COMPOSE_FILE_NAME: {
                        await this.createDevDockerCompose();
                        return;
                    }
                    case LOCAL_DOCKER_COMPOSE_FILE_NAME: {
                        await this.createLocalDockerCompose();
                        return;
                    }
                    case STAGE_DOCKER_COMPOSE_FILE_NAME: {
                        await this.createStageDockerCompose(email);
                    }
                }
            })
        );
    }

    private static async createDevDockerCompose(): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: 'adminer',
                    name: 'adminer',
                    ports: [
                        {
                            internal: 8080,
                            external: 8080
                        }
                    ]
                }
            ],
            volumes: [],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(getPath(DEV_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    private static async createLocalDockerCompose(): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: TRAEFIK_DOCKER_IMAGE,
                    name: 'traefik',
                    command: TRAEFIK_BASE_DOCKER_COMMANDS,
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
                    volumes: [TRAEFIK_DOCKER_SOCK_VOLUME],
                    labels: []
                }
            ],
            volumes: [],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(getPath(LOCAL_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    private static async createStageDockerCompose(email: string): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: TRAEFIK_DOCKER_IMAGE,
                    name: 'traefik',
                    command: [
                        ...TRAEFIK_BASE_DOCKER_COMMANDS,
                        '--entrypoints.web.http.redirections.entrypoint.to=websecure',
                        '--entryPoints.web.http.redirections.entrypoint.scheme=https',
                        '--entrypoints.websecure.asDefault=true',
                        '--certificatesresolvers.sslresolver.acme.httpchallenge=true',
                        '--certificatesresolvers.sslresolver.acme.httpchallenge.entrypoint=web',
                        `--certificatesresolvers.sslresolver.acme.email=${email}`,
                        '--certificatesresolvers.sslresolver.acme.storage=/letsencrypt/acme.json'
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
                        './config:/config',
                        './letsencrypt:/letsencrypt',
                        TRAEFIK_DOCKER_SOCK_VOLUME
                    ],
                    environment: [
                        {
                            key: DefaultEnvKeys.BASIC_AUTH_USER,
                            value: `\${${DefaultEnvKeys.BASIC_AUTH_USER}}`
                        },
                        {
                            key: DefaultEnvKeys.BASIC_AUTH_PASSWORD,
                            value: `\${${DefaultEnvKeys.BASIC_AUTH_PASSWORD}}`
                        }
                    ],
                    entrypoint: [
                        '/bin/sh',
                        '-c',
                        // eslint-disable-next-line stylistic/max-len
                        `htpasswd -nbB "$$${DefaultEnvKeys.BASIC_AUTH_USER}" "$$${DefaultEnvKeys.BASIC_AUTH_PASSWORD}" > /config/.htpasswd && exec traefik`
                    ],
                    labels: []
                }
            ],
            volumes: [],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(getPath(STAGE_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    private static async createProdDockerCompose(email: string): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: TRAEFIK_DOCKER_IMAGE,
                    name: 'traefik',
                    command: [
                        ...TRAEFIK_BASE_DOCKER_COMMANDS,
                        '--entrypoints.web.http.redirections.entrypoint.to=websecure',
                        '--entryPoints.web.http.redirections.entrypoint.scheme=https',
                        '--entrypoints.websecure.asDefault=true',
                        '--certificatesresolvers.sslresolver.acme.httpchallenge=true',
                        '--certificatesresolvers.sslresolver.acme.httpchallenge.entrypoint=web',
                        `--certificatesresolvers.sslresolver.acme.email=${email}`,
                        '--certificatesresolvers.sslresolver.acme.storage=/letsencrypt/acme.json'
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
                        './letsencrypt:/letsencrypt',
                        TRAEFIK_DOCKER_SOCK_VOLUME
                    ],
                    labels: []
                }
            ],
            volumes: [],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(getPath(PROD_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    /**
     * Adds the given compose service to the docker-compose.yaml.
     * @param service - The definition of the service to add.
     * @param port - The port used in local and prod.
     * @param devPort - The port used in development.
     * @param addTraefik - Whether or not the service should be exposed via traefik.
     * @param traefikBasicAuth - ONLY VALID FOR THE STAGE DOCKER COMPOSE FILE. Whether or not to use basic auth.
     * @param subDomain - The domain of the service. Optional.
     * Defaults to "" (which creates the file in the current directory).
     * @param composeFileName - The name of the compose file.
     * Defaults to docker-compose.yaml.
     */
    static async addServiceToCompose(
        service: ComposeService,
        port: number,
        devPort: number,
        addTraefik: boolean,
        traefikBasicAuth: boolean,
        subDomain?: string,
        composeFileName: DockerComposeFileName = PROD_DOCKER_COMPOSE_FILE_NAME
    ): Promise<void> {
        const composePath: Path = getPath(composeFileName);
        const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);

        const labels: string[] = [];
        if (addTraefik) {
            const traefikLabels: string[] = DockerTraefikUtilities.getTraefikLabels(
                service.name,
                port,
                composeFileName,
                subDomain,
                traefikBasicAuth
            );
            labels.push(...traefikLabels);
        }

        definition.services.push({ ...service, labels: [...service.labels ?? [], ...labels] });
        await FsUtilities.updateFile(composePath, this.composeDefinitionToYaml(definition), 'replace');

        if (composeFileName === PROD_DOCKER_COMPOSE_FILE_NAME) {
            await this.addServiceToCompose(service, port, devPort, addTraefik, false, subDomain, LOCAL_DOCKER_COMPOSE_FILE_NAME);
            await this.addServiceToCompose(service, port, devPort, addTraefik, false, subDomain, STAGE_DOCKER_COMPOSE_FILE_NAME);
            if (!addTraefik) {
                return;
            }

            await EnvUtilities.addStaticVariable(
                { key: DefaultEnvKeys.port(service.name), value: devPort, required: true, type: 'number' },
                true
            );

            if (subDomain) {
                await EnvUtilities.addStaticVariable(
                    { key: DefaultEnvKeys.subDomain(service.name), value: subDomain, required: true, type: 'string' },
                    true
                );
                await EnvUtilities.addCalculatedVariable(
                    {
                        key: DefaultEnvKeys.baseUrl(service.name),
                        value: (env, fileName) => {
                            switch (fileName) {
                                // eslint-disable-next-line sonar/no-duplicate-string
                                case 'dev.docker-compose.yaml': {
                                    return `http://localhost:${'PORT_PLACEHOLDER'}`;
                                }
                                // eslint-disable-next-line sonar/no-duplicate-string
                                case 'local.docker-compose.yaml': {
                                    return `http://${'SUB_DOMAIN_PLACEHOLDER'}.localhost`;
                                }
                                // eslint-disable-next-line sonar/no-duplicate-string
                                case 'docker-compose.yaml': {
                                    return `https://${'SUB_DOMAIN_PLACEHOLDER'}.${'PROD_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                                // eslint-disable-next-line sonar/no-duplicate-string
                                case 'stage.docker-compose.yaml': {
                                    return `https://${'SUB_DOMAIN_PLACEHOLDER'}.${'STAGE_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                            }
                        },
                        required: true,
                        type: 'string'
                    }
                );
                await EnvUtilities.addCalculatedVariable(
                    {
                        key: DefaultEnvKeys.domain(service.name),
                        value: (env, fileName) => {
                            switch (fileName) {
                                case 'dev.docker-compose.yaml': {
                                    return `localhost:${'PORT_PLACEHOLDER'}`;
                                }
                                case 'local.docker-compose.yaml': {
                                    return `${'SUB_DOMAIN_PLACEHOLDER'}.localhost`;
                                }
                                case 'docker-compose.yaml': {
                                    return `${'SUB_DOMAIN_PLACEHOLDER'}.${'PROD_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                                case 'stage.docker-compose.yaml': {
                                    return `${'SUB_DOMAIN_PLACEHOLDER'}.${'STAGE_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                            }
                        },
                        required: true,
                        type: 'string'
                    }
                );
            }
            else {
                await EnvUtilities.addCalculatedVariable(
                    {
                        key: DefaultEnvKeys.baseUrl(service.name),
                        value: (env, fileName) => {
                            switch (fileName) {
                                case 'dev.docker-compose.yaml': {
                                    return `http://localhost:${'PORT_PLACEHOLDER'}`;
                                }
                                case 'local.docker-compose.yaml': {
                                    return 'http://localhost';
                                }
                                case 'docker-compose.yaml': {
                                    return `https://${'PROD_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                                case 'stage.docker-compose.yaml': {
                                    return `https://${'STAGE_ROOT_DOMAIN_PLACEHOLDER'}`;
                                }
                            }
                        },
                        required: true,
                        type: 'string'
                    }
                );
                await EnvUtilities.addCalculatedVariable(
                    {
                        key: DefaultEnvKeys.domain(service.name),
                        value: (env, fileName) => {
                            switch (fileName) {
                                case 'dev.docker-compose.yaml': {
                                    return `localhost:${'PORT_PLACEHOLDER'}`;
                                }
                                case 'local.docker-compose.yaml': {
                                    return 'localhost';
                                }
                                case 'docker-compose.yaml': {
                                    return 'PROD_ROOT_DOMAIN_PLACEHOLDER';
                                }
                                case 'stage.docker-compose.yaml': {
                                    return 'STAGE_ROOT_DOMAIN_PLACEHOLDER';
                                }
                            }
                        },
                        required: true,
                        type: 'string'
                    }
                );
            }
        }

        const environmentModelFilePath: Path = getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);
        await FsUtilities.replaceAllInFile(environmentModelFilePath, '\'PORT_PLACEHOLDER\'', `env.${DefaultEnvKeys.port(service.name)}`);
        await FsUtilities.replaceAllInFile(
            environmentModelFilePath,
            '\'SUB_DOMAIN_PLACEHOLDER\'',
            `env.${DefaultEnvKeys.subDomain(service.name)}`
        );
        await FsUtilities.replaceAllInFile(
            environmentModelFilePath,
            '\'PROD_ROOT_DOMAIN_PLACEHOLDER\'',
            `env.${DefaultEnvKeys.PROD_ROOT_DOMAIN}`
        );
        await FsUtilities.replaceAllInFile(
            environmentModelFilePath,
            '\'STAGE_ROOT_DOMAIN_PLACEHOLDER\'',
            `env.${DefaultEnvKeys.STAGE_ROOT_DOMAIN}`
        );
    }

    /**
     * Gets all services from the docker compose file.
     * @param rootDir - The directory of the Monux monorepo.
     * @returns The parsed services.
     */
    static async getComposeServices(rootDir: string): Promise<ComposeService[]> {
        const composePath: Path = getPath(rootDir, PROD_DOCKER_COMPOSE_FILE_NAME);
        const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);
        return definition.services;
    }

    /**
     * Adds a volume to the docker compose files.
     * @param volume - The volume to add.
     */
    static async addVolumeToComposeFiles(volume: string): Promise<void> {
        await Promise.all(dockerComposeFileNames.map(d => this.addVolumeToCompose(volume, d)));
    }

    private static async addVolumeToCompose(
        volume: string,
        composeFileName: DockerComposeFileName
    ): Promise<void> {
        const composePath: Path = getPath(composeFileName);
        const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);
        definition.volumes.push(volume);
        await FsUtilities.updateFile(composePath, this.composeDefinitionToYaml(definition), 'replace');
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

    private static getServiceVolumesSection(volumes: string[] | undefined): string[] {
        if (!volumes?.length) {
            return [];
        }

        return [
            '\t\tvolumes:',
            ...volumes.map(v => `\t\t\t- ${v}`)
        ];
    }

    private static async yamlToComposeDefinition(composePath: Path): Promise<ComposeDefinition> {
        // Load the YAML file
        const fileContent: string = await FsUtilities.readFile(composePath);
        const parsedYaml: ParsedDockerCompose | undefined = yaml.load(fileContent) as ParsedDockerCompose | undefined;

        // Transform YAML into ComposeDefinition
        const services: ComposeService[] = Object.entries(parsedYaml?.services ?? {})
            .map(([serviceName, serviceData]: [string, ParsedDockerComposeService]) => {
                const res: ComposeService = {
                    name: serviceName,
                    volumes: serviceData.volumes,
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