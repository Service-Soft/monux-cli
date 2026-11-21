
import { DEV_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME, WORKSPACE_FILE_NAME } from '../constants';
import { CPUtilities, FsUtilities, JsonUtilities, PathUtilities, Path, YamlUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';
import { ComposeBuild, ComposeDefinition, ComposePort, ComposeService, ComposeServiceEnvironment } from './compose-file.model';
import { DockerComposeFileName, dockerComposeFileNames } from './docker-compose-file-name.model';
import { DockerLabel } from './docker-labels.enum';
import { DockerTraefikUtilities, TRAEFIK_BASE_DOCKER_COMMANDS, TRAEFIK_BASIC_AUTH_VOLUME, TRAEFIK_CERT_RESOLVER, TRAEFIK_CERTIFICATES_VOLUME, TRAEFIK_CERTIFICATES_VOLUME_NAME, TRAEFIK_DOCKER_IMAGE, TRAEFIK_DOCKER_SOCK_VOLUME, TRAEFIK_SECURE_ENTRYPOINT } from './docker-traefik.utilities';
import { ParsedDockerCompose, ParsedDockerComposeEnvironment, ParsedDockerComposeService, ParsedDockerComposeServiceNetwork } from './parsed-docker-compose.model';
import { FullyParsedDockerService, isFullyParsedDockerService, StringifiedDockerService, StringifiedDockerServiceWithParsedLabels } from './stringified-docker-service.model';

/**
 * Utilities for docker specific code generation/manipulation.
 */
export abstract class DockerUtilities {

    /**
     * Finds the docker services of every Monux workspace on this machine.
     * @param all - Whether stopped services are included.
     * @returns The services that belong to a Monux workspace.
     */
    static async findServices(all: boolean): Promise<FullyParsedDockerService[]> {
        const output: string = await CPUtilities.resolveOutput(`docker ps${all ? ' -a' : ''} --format "{{json .}}" --size=false`);

        const services: StringifiedDockerServiceWithParsedLabels[] = await Promise.all(output
            .split('\n')
            .filter(line => line)
            .map(async line => {
                const service: StringifiedDockerService = JsonUtilities.parse(line);
                const labels: Record<string, string | undefined> = this.parseLabels(service.Labels);
                const config: WorkspaceConfig | undefined = await this.findWorkspaceConfig(labels);
                return {
                    ...service,
                    Labels: labels,
                    config: config
                };
            }));

        return services.filter(isFullyParsedDockerService);
    }

    private static async findWorkspaceConfig(labels: Record<DockerLabel, string | undefined>): Promise<WorkspaceConfig | undefined> {
        const composeProjectDir: string | undefined = labels[DockerLabel.COMPOSE_PROJECT_DIR];
        return composeProjectDir
            ? await WorkspaceUtilities.getConfig(PathUtilities.resolve(composeProjectDir, WORKSPACE_FILE_NAME))
            : undefined;
    }

    private static parseLabels(labels: string): Record<string, string | undefined> {
        return labels.split(',')
            .reduce<Record<string, string | undefined>>((acc, pair) => {
                if (!pair) {
                    return acc;
                }
                const [key, ...value] = pair.split('=');
                acc[key.trim()] = value.join('').trim();
                return acc;
            }, {});
    }

    /**
     * Creates the initial docker compose files at the given path.
     * @param email - The email that should be used for the letsencrypt certificate.
     * Defaults to "" (which creates the file in the current directory).
     */
    static async createComposeFiles(email: string): Promise<void> {
        await Promise.all(dockerComposeFileNames.map(async d => await this.createComposeFile(d, email)));
    }

    /**
     * Creates one of the docker compose files of a new workspace, with its traefik.
     * @param fileName - The compose file.
     * @param email - The email that should be used for the letsencrypt certificate.
     */
    static async createComposeFile(fileName: DockerComposeFileName, email: string): Promise<void> {
        switch (fileName) {
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
        await FsUtilities.createFile(PathUtilities.resolve(DEV_DOCKER_COMPOSE_FILE_NAME), yaml);
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
        await FsUtilities.createFile(PathUtilities.resolve(LOCAL_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    private static async createStageDockerCompose(email: string): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: TRAEFIK_DOCKER_IMAGE,
                    name: 'traefik',
                    command: [
                        ...TRAEFIK_BASE_DOCKER_COMMANDS,
                        `--entrypoints.web.http.redirections.entrypoint.to=${TRAEFIK_SECURE_ENTRYPOINT}`,
                        '--entryPoints.web.http.redirections.entrypoint.scheme=https',
                        `--entrypoints.${TRAEFIK_SECURE_ENTRYPOINT}.asDefault=true`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.httpchallenge=true`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.httpchallenge.entrypoint=web`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.email=${email}`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.storage=/letsencrypt/acme.json`
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
                        TRAEFIK_CERTIFICATES_VOLUME,
                        TRAEFIK_DOCKER_SOCK_VOLUME,
                        TRAEFIK_BASIC_AUTH_VOLUME
                    ],
                    labels: []
                }
            ],
            volumes: [TRAEFIK_CERTIFICATES_VOLUME_NAME],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(PathUtilities.resolve(STAGE_DOCKER_COMPOSE_FILE_NAME), yaml);
    }

    private static async createProdDockerCompose(email: string): Promise<void> {
        const compose: ComposeDefinition = {
            services: [
                {
                    image: TRAEFIK_DOCKER_IMAGE,
                    name: 'traefik',
                    command: [
                        ...TRAEFIK_BASE_DOCKER_COMMANDS,
                        `--entrypoints.web.http.redirections.entrypoint.to=${TRAEFIK_SECURE_ENTRYPOINT}`,
                        '--entryPoints.web.http.redirections.entrypoint.scheme=https',
                        `--entrypoints.${TRAEFIK_SECURE_ENTRYPOINT}.asDefault=true`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.httpchallenge=true`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.httpchallenge.entrypoint=web`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.email=${email}`,
                        `--certificatesresolvers.${TRAEFIK_CERT_RESOLVER}.acme.storage=/letsencrypt/acme.json`
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
                        TRAEFIK_CERTIFICATES_VOLUME,
                        TRAEFIK_DOCKER_SOCK_VOLUME
                    ],
                    labels: []
                }
            ],
            volumes: [TRAEFIK_CERTIFICATES_VOLUME_NAME],
            networks: []
        };
        const yaml: string[] = this.composeDefinitionToYaml(compose);
        await FsUtilities.createFile(PathUtilities.resolve(PROD_DOCKER_COMPOSE_FILE_NAME), yaml);
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
        const composePath: Path = PathUtilities.resolve(composeFileName);
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
            await this.addServiceToCompose(service, port, devPort, addTraefik, traefikBasicAuth, subDomain, STAGE_DOCKER_COMPOSE_FILE_NAME);
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

        await this.fillEnvironmentPlaceholders(service.name);
    }

    /**
     * The calculated variables above are written with placeholders, which are replaced with the variables of the
     * service here. Which placeholders a calculation uses depends on the service, such as whether it has a sub domain.
     * They are Monux's own, so unlike an edit of a framework's output, a missing one is no error.
     * @param serviceName - The name of the service whose variables replace the placeholders.
     */
    private static async fillEnvironmentPlaceholders(serviceName: string): Promise<void> {
        const environmentModelFilePath: Path = PathUtilities.resolve(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME);
        const content: string = await FsUtilities.readFile(environmentModelFilePath);
        const filled: string = content
            .replaceAll('\'PORT_PLACEHOLDER\'', `env.${DefaultEnvKeys.port(serviceName)}`)
            .replaceAll('\'SUB_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.subDomain(serviceName)}`)
            .replaceAll('\'PROD_ROOT_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.PROD_ROOT_DOMAIN}`)
            .replaceAll('\'STAGE_ROOT_DOMAIN_PLACEHOLDER\'', `env.${DefaultEnvKeys.STAGE_ROOT_DOMAIN}`);
        if (filled !== content) {
            await FsUtilities.updateFile(environmentModelFilePath, filled, 'replace');
        }
    }

    /**
     * Gets all services from the docker compose file.
     * @param rootDir - The directory of the Monux monorepo.
     * @returns The parsed services.
     */
    static async getComposeServices(rootDir: string): Promise<ComposeService[]> {
        const composePath: Path = PathUtilities.resolve(rootDir, PROD_DOCKER_COMPOSE_FILE_NAME);
        const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);
        return definition.services;
    }

    /**
     * Adds a volume to the docker compose files.
     * @param volume - The volume to add.
     */
    /**
     * Tells an Angular server which hosts it answers, the ones traefik routes to it, in every compose file with traefik.
     * Angular refuses a request for any other host, which keeps a forged host out of what the server renders.
     * @param serviceName - The name of the service.
     * @param subDomain - The sub domain of the service.
     */
    static async addAllowedHosts(serviceName: string, subDomain: string | undefined): Promise<void> {
        for (const composeFileName of [LOCAL_DOCKER_COMPOSE_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME]) {
            const composePath: Path = PathUtilities.resolve(composeFileName);
            const definition: ComposeDefinition = await this.yamlToComposeDefinition(composePath);
            const service: ComposeService | undefined = definition.services.find(s => s.name === serviceName);
            if (service == undefined) {
                throw new Error(`The service "${serviceName}" is not in ${composeFileName}`);
            }
            const hosts: string[] = DockerTraefikUtilities.resolveHosts(serviceName, composeFileName, subDomain);
            service.environment = [...service.environment ?? [], { key: 'NG_ALLOWED_HOSTS', value: hosts.join(',') }];
            await FsUtilities.updateFile(composePath, this.composeDefinitionToYaml(definition), 'replace');
        }
    }

    /**
     * Adds a named volume to every compose file of the workspace.
     * @param volume - The name of the volume.
     */
    static async addVolumeToComposeFiles(volume: string): Promise<void> {
        await Promise.all(dockerComposeFileNames.map(d => this.addVolumeToCompose(volume, d)));
    }

    private static async addVolumeToCompose(
        volume: string,
        composeFileName: DockerComposeFileName
    ): Promise<void> {
        const composePath: Path = PathUtilities.resolve(composeFileName);
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
        return !services.length ? [] : ['services:', ...services.map(s => this.getService(s))];
    }

    private static getVolumeSection(volumes: string[]): string[] {
        return !volumes.length ? [] : ['', 'volumes:', ...volumes.map(v => `\t${v}:`)];
    }

    private static getNetworkSection(networks: string[]): string[] {
        return !networks.length ? [] : ['', 'networks:', ...networks.map(n => `\t${n}:`)];
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
            ...this.getServiceEnvFileSection(service.envFile),
            ...this.getServiceNetworksSection(service.networks),
            ...this.getServiceLabelsSection(service.labels)
        ].join('\n');
    }

    private static getServiceLabelsSection(labels: string[] | undefined): string[] {
        return !labels?.length ? [] : ['\t\tlabels:', ...labels.map(l => `\t\t\t- ${l}`)];
    }

    private static getServicePortsSection(ports: ComposePort[] | undefined): string[] {
        if (!ports?.length) {
            return [];
        }

        return [
            '\t\tports:',
            ...ports.map(p => {
                return typeof p === 'number' ? `\t\t\t- ${p}` : `\t\t\t- ${p.external}:${p.internal}`;
            })
        ];
    }

    private static getServiceCommandSection(command: string[] | undefined): string[] {
        return command == undefined ? [] : ['\t\tcommand:', ...command.map(e => `\t\t\t- ${e}`)];
    }

    private static getServiceEnvironmentSection(environment: ComposeServiceEnvironment | undefined): string[] {
        return !environment?.length ? [] : ['\t\tenvironment:', ...environment.map(e => `\t\t\t${e.key}: ${e.value}`)];
    }

    private static getServiceEnvFileSection(envFile: string[] | undefined): string[] {
        return !envFile?.length ? [] : ['\t\tenv_file:', ...envFile.map(f => `\t\t\t- ${f}`)];
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
        return image == undefined ? [] : [`\t\timage: ${image}`];
    }

    private static getServiceNetworksSection(networks: string[] | undefined): string[] {
        return !networks?.length ? [] : ['\t\tnetworks:', ...networks.map(n => `\t\t\t${n}:`)];
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
        const parsedYaml: ParsedDockerCompose | undefined = YamlUtilities.parse<ParsedDockerCompose>(fileContent);

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
                    envFile: typeof serviceData.env_file === 'string' ? [serviceData.env_file] : serviceData.env_file,
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
        // a single port is the same inside and outside of the container
        const [external, internal = external] = portStr.split(':').map(Number);
        return { internal, external };
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