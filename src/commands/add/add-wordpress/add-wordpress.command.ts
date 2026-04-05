import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { ComposeService, DockerUtilities } from '../../../docker';
import { QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys } from '../../../env';
import { OmitStrict } from '../../../types';
import { getPath, toKebabCase } from '../../../utilities';
import { BaseAddCommand, AddConfiguration } from '../models';

/**
 * Configuration for adding a wordpress service to the monorepo.
 */
type AddWordpressConfiguration = AddConfiguration & {
    /**
     * The sub domain for the service.
     */
    subDomain?: string
};

/**
 * The command for adding a wordpress server to the monorepo.
 */
export class AddWordpressCommand extends BaseAddCommand<AddWordpressConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddWordpressConfiguration, keyof AddConfiguration>> = {
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'sub domain'
        }
    };

    override async run(): Promise<void> {
        const config: AddWordpressConfiguration = await this.getConfig();
        const { dbComposeServiceName, databaseName } = await DbUtilities.configureDb(config.name, DbType.MARIADB, getPath('.'));
        await this.createProject(config, dbComposeServiceName, databaseName);
    }

    private async createProject(
        config: AddWordpressConfiguration,
        dbServiceName: string,
        databaseName: string,
        version: string = 'php8.5'
    ): Promise<void> {
        const serviceDefinition: ComposeService = {
            name: config.name,
            image: `wordpress:${version}`,
            volumes: [`${toKebabCase(config.name)}-data:/var/www/html`],
            environment: [
                {
                    key: 'WORDPRESS_DB_HOST',
                    value: dbServiceName
                },
                {
                    key: 'WORDPRESS_DB_USER',
                    value: `\${${DefaultEnvKeys.dbUser(dbServiceName, databaseName)}}`
                },
                {
                    key: 'WORDPRESS_DB_PASSWORD',
                    value: `\${${DefaultEnvKeys.dbPassword(dbServiceName, databaseName)}}`
                },
                {
                    key: 'WORDPRESS_DB_NAME',
                    value: `\${${DefaultEnvKeys.dbName(dbServiceName, databaseName)}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(
            serviceDefinition,
            80,
            80,
            true,
            true,
            config.subDomain
        );
        await DockerUtilities.addVolumeToComposeFiles(`${toKebabCase(config.name)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 80, internal: 80 }]
            },
            80,
            80,
            false,
            false,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
    }
}