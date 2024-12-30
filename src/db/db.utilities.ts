import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { ComposeService, DockerUtilities } from '../docker';
import { EnvUtilities } from '../env';
import { generatePlaceholderPassword, toKebabCase, toSnakeCase } from '../utilities';

/**
 * Utilities for handling databases.
 */
export abstract class DbUtilities {

    /**
     * Gets all the available database services in the compose file.
     * @returns An array of compose services.
     */
    static async getAvailableDatabases(): Promise<ComposeService[]> {
        const services: ComposeService[] = await DockerUtilities.getComposeServices();
        return services.filter(s => this.isDatabaseService(s));
    }

    /**
     * Adds a new postgres db to the docker compose file.
     * @param name - The name of the service.
     * @param database - The name of the default database.
     * @param password - The default users password.
     * @param user - The name of the default user.
     * @param version - The version of postgres to use.
     */
    static async createPostgresDatabase(
        name: string,
        database: string = `${toSnakeCase(name)}_database`,
        password: string = generatePlaceholderPassword(),
        user: string = `${toSnakeCase(name)}_user`,
        version: number = 16
    ): Promise<void> {
        const PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(name)}_password`;
        const USER_ENV_VARIABLE: string = `${toSnakeCase(name)}_user`;
        const DATABASE_ENV_VARIABLE: string = `${toSnakeCase(name)}_database`;
        const HOST_ENV_VARIABLE: string = `${toSnakeCase(name)}_host`;
        const serviceDefinition: ComposeService = {
            name,
            image: `postgres:${version}`,
            volumes: [
                {
                    path: `${toKebabCase(name)}-data`,
                    mount: '/var/lib/postgresql/data'
                }
            ],
            environment: [
                {
                    key: 'POSTGRES_PASSWORD',
                    value: `\${${PASSWORD_ENV_VARIABLE}}`
                },
                {
                    key: 'POSTGRES_USER',
                    value: `\${${USER_ENV_VARIABLE}}`
                },
                {
                    key: 'POSTGRES_DB',
                    value: `\${${DATABASE_ENV_VARIABLE}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(serviceDefinition);
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 5432, internal: 5432 }]
            },
            undefined,
            undefined,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`, undefined, DEV_DOCKER_COMPOSE_FILE_NAME);
        await EnvUtilities.addVariable({
            key: PASSWORD_ENV_VARIABLE,
            value: password,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addVariable({
            key: USER_ENV_VARIABLE,
            value: user,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addVariable({
            key: DATABASE_ENV_VARIABLE,
            value: database,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addVariable({
            key: HOST_ENV_VARIABLE,
            value: 'localhost',
            required: true,
            type: 'string'
        });
    }

    private static isDatabaseService(service: ComposeService): boolean {
        if (!service.image) {
            return false;
        }
        return service.image.startsWith('postgres') || service.image.startsWith('mariadb') || service.image.startsWith('mysql');
    }
}