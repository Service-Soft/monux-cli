import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { ComposeService, DockerUtilities } from '../../../docker';
import { QuestionsFor } from '../../../encapsulation';
import { EnvUtilities } from '../../../env';
import { OmitStrict } from '../../../types';
import { toKebabCase, toSnakeCase } from '../../../utilities';
import { AddCommand, AddConfiguration } from '../models';

/**
 * Configuration for adding a wordpress service to the monorepo.
 */
type AddWordpressConfiguration = AddConfiguration & {};

/**
 * The command for adding a wordpress server to the monorepo.
 */
export class AddWordpressCommand extends AddCommand<AddWordpressConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddWordpressConfiguration, keyof AddConfiguration>> = {};

    override async run(): Promise<void> {
        const config: AddWordpressConfiguration = await this.getConfig();
        await EnvUtilities.addVariable({ key: `${toSnakeCase(config.name)}_domain`, required: true, type: 'string', value: 'localhost' });
        await EnvUtilities.addVariable({ key: `${toSnakeCase(config.name)}_base_url`, required: true, type: 'string', value: 'http://localhost' });
        const dbName: string = await DbUtilities.configureDb(config.name, DbType.MARIADB);
        await this.createProject(config, dbName);
    }

    private async createProject(config: AddWordpressConfiguration, dbHost: string, version: string = '6.1'): Promise<void> {
        const DB_PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(config.name)}_db_password`;
        const DB_USER_ENV_VARIABLE: string = `${toSnakeCase(config.name)}_db_user`;
        const DB_NAME_ENV_VARIABLE: string = `${toSnakeCase(config.name)}_database`;
        const serviceDefinition: ComposeService = {
            name: config.name,
            image: `wordpress:${version}`,
            volumes: [
                {
                    path: `${toKebabCase(config.name)}-data`,
                    mount: '/var/www/html'
                }
            ],
            environment: [
                {
                    key: 'WORDPRESS_DB_HOST',
                    value: dbHost
                },
                {
                    key: 'WORDPRESS_DB_USER',
                    value: `\${${DB_USER_ENV_VARIABLE}}`
                },
                {
                    key: 'WORDPRESS_DB_PASSWORD',
                    value: `\${${DB_PASSWORD_ENV_VARIABLE}}`
                },
                {
                    key: 'WORDPRESS_DB_NAME',
                    value: `\${${DB_NAME_ENV_VARIABLE}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose({
            ...serviceDefinition,
            labels: DockerUtilities.getTraefikLabels(config.name, 80)
        });
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(config.name)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 80, internal: 80 }]
            },
            undefined,
            undefined,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(config.name)}-data`, undefined, DEV_DOCKER_COMPOSE_FILE_NAME);
    }
}