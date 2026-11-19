import { ModuleKind } from 'typescript';

import { APPS_DIRECTORY_NAME, BASE_TS_CONFIG_FILE_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor, CryptoUtilities, PathUtilities, Path, LogUtilities } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { TsUtilities } from '../../../ts';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { StringUtilities } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { ZibriUtilities } from '../../../zibri';
import { AddConfiguration, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new zibri api.
 */
type AddZibriConfiguration = AddConfiguration & {
    /**
     * The name of the frontend where the reset password functionality is implemented.
     */
    frontendName: string,
    /**
     * The port that should be used by the application.
     * @default 3000
     */
    port: number,
    /**
     * The sub domain that this service should be reached under.
     * If nothing is provided, Monux assumes that the service should be reached under the root domain
     * and under the www sub domain.
     */
    subDomain?: string,
    /**
     * The email for the default root user.
     */
    defaultUserEmail: string,
    /**
     * The password for the default root user.
     */
    defaultUserPassword: string
};

/**
 * Command that handles adding a zibri api to the monorepo.
 */
export class AddZibriCommand extends BaseAddCommand<AddZibriConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddZibriConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            name: 'port',
            message: 'port',
            validate: (v?: number) => !!v,
            default: 3000
        },
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'sub domain'
        },
        defaultUserEmail: {
            type: 'input',
            name: 'defaultUserEmail',
            message: 'Email of the default user',
            validate: (v?: string) => !!v,
            default: async () => (await FsUtilities.readFile(PathUtilities.resolve(PROD_DOCKER_COMPOSE_FILE_NAME)))
                .split('.acme.email=')[1]
                .split('\n')[0]
        },
        defaultUserPassword: {
            type: 'input',
            name: 'defaultUserPassword',
            message: 'Password of the default user',
            validate: (v?: string) => v != undefined && v.length >= 12 ? true : 'The password needs to be at least 12 characters long'
        },
        frontendName: {
            type: 'input',
            name: 'frontendName',
            message: 'Name of the frontend where the reset password ui is implemented',
            validate: (v?: string) => !!v
        }
    };

    override async run(): Promise<void> {
        const config: AddZibriConfiguration = await this.getConfig();
        const { dbComposeServiceName, databaseName } = await DbUtilities.configureDb(config.name, DbType.POSTGRES, PathUtilities.resolve('.'));
        const root: Path = await this.createProject(config);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createZibriDatasource(dbComposeServiceName, databaseName, DbType.POSTGRES, root, config.name);
        await this.updateIndexTs(root, config);
        await this.setupAuthVariables(root, config);

        await Promise.all([
            EslintUtilities.setupProjectEslint(root, true, 'tsconfig.json'),
            this.setupTsConfig(config.name),
            DockerUtilities.addServiceToCompose(
                {
                    name: config.name,
                    build: {
                        dockerfile: `./${root}/${DOCKER_FILE_NAME}`,
                        context: '.'
                    },
                    volumes: [`/${config.name}`]
                },
                3000,
                config.port,
                true,
                false,
                config.subDomain
            ),
            this.createDockerfile(root, config)
        ]);

        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, ESLINT_CONFIG_FILE_NAME),
            '    ...baseConfig,',
            [
                '    ...baseConfig,',
                '    { ignores: [\'./assets\'] },'
            ].join('\n')
        );

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));
    }

    private async createProject(config: AddZibriConfiguration): Promise<Path> {
        LogUtilities.step('Creating the project');
        await ZibriUtilities.runCommand(
            PathUtilities.resolve(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            {} as never
        );
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        return newProject.path;
    }

    private async createZibriDatasource(
        dbServiceName: string,
        databaseName: string,
        dbType: DbType.POSTGRES,
        root: Path,
        projectName: string
    ): Promise<void> {
        const datasourcesPath: Path = PathUtilities.resolve(
            root,
            'src',
            'data-sources'
        );
        const newDbPath: Path = PathUtilities.resolve(datasourcesPath, StringUtilities.toKebabCase(databaseName));
        await FsUtilities.rm(newDbPath);
        await FsUtilities.rm(PathUtilities.resolve(datasourcesPath, 'db'));
        await FsUtilities.createFile(
            PathUtilities.resolve(newDbPath, `${StringUtilities.toKebabCase(databaseName)}.data-source.ts`),
            [
                // eslint-disable-next-line stylistic/max-len
                'import { BaseDataSource, BaseEntity, DataSource, Newable, DataSourceOptions, MigrationEntity, MailingList, MailingListSubscriber, MailingListSubscriptionConfirmationToken, JwtRefreshToken, JwtCredentials, Log, PasswordResetToken } from \'zibri\';',
                '',
                'import { environment } from \'../../environment/environment\';',
                'import { User } from \'../../models\';',
                '',
                '@DataSource()',
                `export class ${StringUtilities.toPascalCase(databaseName)}DataSource extends BaseDataSource {`,
                '    options: DataSourceOptions = {',
                `        type: '${dbType}',`,
                `        host: environment.${DefaultEnvKeys.dbHost(dbServiceName)},`,
                '        port: 5432,',
                `        username: environment.${DefaultEnvKeys.dbUser(dbServiceName, databaseName)},`,
                `        password: environment.${DefaultEnvKeys.dbPassword(dbServiceName, databaseName)},`,
                `        database: environment.${DefaultEnvKeys.dbName(dbServiceName, databaseName)},`,
                '        synchronize: true',
                '    };',
                '    entities: Newable<BaseEntity>[] = [',
                '        MigrationEntity,',
                '        User,',
                '        JwtRefreshToken,',
                '        JwtCredentials,',
                '        PasswordResetToken,',
                '        MailingList,',
                '        MailingListSubscriber,',
                '        MailingListSubscriptionConfirmationToken,',
                '        Log',
                '    ];',
                '}'
            ]
        );
        await FsUtilities.createFile(PathUtilities.resolve(newDbPath, 'migrations', 'index.ts'), '');
        await FsUtilities.createFile(PathUtilities.resolve(newDbPath, 'index.ts'), `export * from './${StringUtilities.toKebabCase(databaseName)}.data-source';`);
        await FsUtilities.rm(PathUtilities.resolve(datasourcesPath, 'index.ts'));
        await FsUtilities.createFile(PathUtilities.resolve(datasourcesPath, 'index.ts'), `export * from './${StringUtilities.toKebabCase(databaseName)}';`);

        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'index.ts'),
            'import { DbDataSource } from \'./data-sources\';',
            `import { ${StringUtilities.toPascalCase(databaseName)}DataSource } from './data-sources';`
        );
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'index.ts'),
            'dataSources: [DbDataSource]',
            `dataSources: [${StringUtilities.toPascalCase(databaseName)}DataSource]`
        );
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'index.ts'),
            'createDefaultData(DbDataSource);',
            `createDefaultData(${StringUtilities.toPascalCase(databaseName)}DataSource);`
        );

        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);

        await EnvUtilities.addProjectVariableKey(
            projectName,
            environmentModel,
            DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            true,
            PathUtilities.resolve('.')
        );
        await EnvUtilities.addProjectVariableKey(
            projectName,
            environmentModel,
            DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            true,
            PathUtilities.resolve('.')
        );
        await EnvUtilities.addProjectVariableKey(projectName,
            environmentModel,
            DefaultEnvKeys.dbName(dbServiceName, databaseName),
            true,
            PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, DefaultEnvKeys.dbHost(dbServiceName), true, PathUtilities.resolve('.'));
    }

    private async updateIndexTs(root: Path, config: AddZibriConfiguration): Promise<void> {
        const indexTs: Path = PathUtilities.resolve(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(
            indexTs,
            'baseUrl: \'http://localhost:3000\'',
            `baseUrl: environment.${DefaultEnvKeys.baseUrl(config.name)}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            '\'JWT_ACCESS_TOKEN_SECRET\'',
            `environment.${DefaultEnvKeys.ACCESS_TOKEN_SECRET}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            '\'JWT_REFRESH_TOKEN_SECRET\'',
            `environment.${DefaultEnvKeys.REFRESH_TOKEN_SECRET}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            '\'http://localhost:4200/confirm-password-reset\'',
            `\`\${environment.${DefaultEnvKeys.baseUrl(config.frontendName)}}/confirm-password-reset\``
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'defaultSender: \'\'',
            `defaultSender: environment.${DefaultEnvKeys.WEBSERVER_MAIL_USER}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'host: \'\'',
            `host: environment.${DefaultEnvKeys.WEBSERVER_MAIL_HOST}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'port: 0',
            `port: environment.${DefaultEnvKeys.WEBSERVER_MAIL_PORT}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'user: \'\'',
            `user: environment.${DefaultEnvKeys.WEBSERVER_MAIL_USER}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'pass: \'\'',
            `pass: environment.${DefaultEnvKeys.WEBSERVER_MAIL_PASSWORD}`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'import { version } from \'../package.json\';',
            [
                'import { version } from \'../package.json\';',
                'import { environment } from \'./environment/environment\';'
            ].join('\n')
        );

        const createDefaultDataTs: Path = PathUtilities.resolve(root, 'src', 'create-default-data.function.ts');
        await FsUtilities.replaceInFile(
            createDefaultDataTs,
            '\'password\'',
            `environment.${DefaultEnvKeys.defaultUserPassword(config.name)}`
        );
        await FsUtilities.replaceAllInFile(
            createDefaultDataTs,
            '\'zibri@zibri.de\'',
            `environment.${DefaultEnvKeys.defaultUserEmail(config.name)}`
        );
        await TsUtilities.addImportStatements(
            createDefaultDataTs,
            [{ defaultImport: false, element: 'environment', path: './environment/environment' }]
        );
    }

    private async setupTsConfig(projectName: string): Promise<void> {
        LogUtilities.step('Setting up the tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
                compilerOptions: {
                    emitDecoratorMetadata: undefined,
                    experimentalDecorators: undefined,
                    forceConsistentCasingInFileNames: undefined,
                    allowSyntheticDefaultImports: undefined,
                    sourceMap: undefined,
                    skipLibCheck: undefined,
                    noImplicitAny: undefined,
                    noFallthroughCasesInSwitch: undefined,
                    module: 'nodenext' as unknown as ModuleKind,
                    moduleResolution: undefined
                }
            }
        );
    }

    private async createDockerfile(root: string, config: AddZibriConfiguration): Promise<void> {
        await FsUtilities.createFile(
            PathUtilities.resolve(root, DOCKER_FILE_NAME),
            [
                'FROM node:20 AS build',
                '# Set to a non-root built-in user `node`',
                'USER node',
                'RUN mkdir -p /home/node/root',
                'COPY --chown=node . /home/node/root',
                'WORKDIR /home/node/root',
                'RUN npm install',
                `RUN npm run build --workspace=${APPS_DIRECTORY_NAME}/${config.name} --omit=dev`,
                '',
                'FROM node:20',
                'WORKDIR /usr/app',
                `COPY --from=build /home/node/root/${APPS_DIRECTORY_NAME}/${config.name}/dist ./`,
                'CMD node bundle'
            ]
        );
    }

    private async setupAuthVariables(
        root: string,
        config: AddZibriConfiguration
    ): Promise<void> {
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.defaultUserEmail(config.name),
            required: true,
            type: 'string',
            value: config.defaultUserEmail
        }, false);
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.defaultUserPassword(config.name),
            required: true,
            type: 'string',
            value: config.defaultUserPassword
        }, false);
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.ACCESS_TOKEN_SECRET, required: true, type: 'string', value: CryptoUtilities.generatePassword() },
            false
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.REFRESH_TOKEN_SECRET, required: true, type: 'string', value: CryptoUtilities.generatePassword() },
            false
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.WEBSERVER_MAIL_USER, required: true, type: 'string', value: undefined },
            false
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.WEBSERVER_MAIL_PASSWORD, required: true, type: 'string', value: undefined },
            false
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.WEBSERVER_MAIL_HOST, required: true, type: 'string', value: undefined },
            false
        );
        await EnvUtilities.addStaticVariable(
            { key: DefaultEnvKeys.WEBSERVER_MAIL_PORT, required: true, type: 'number', value: undefined },
            false
        );

        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        await EnvUtilities.addProjectVariableKey(
            config.name,
            environmentModel,
            DefaultEnvKeys.defaultUserEmail(config.name),
            true,
            PathUtilities.resolve('.')
        );
        await EnvUtilities.addProjectVariableKey(
            config.name,
            environmentModel,
            DefaultEnvKeys.defaultUserPassword(config.name),
            true,
            PathUtilities.resolve('.')
        );
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.ACCESS_TOKEN_SECRET, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.REFRESH_TOKEN_SECRET, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.WEBSERVER_MAIL_USER, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.WEBSERVER_MAIL_PASSWORD, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.WEBSERVER_MAIL_HOST, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.WEBSERVER_MAIL_PORT, true, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(
            config.name,
            environmentModel,
            DefaultEnvKeys.baseUrl(config.frontendName),
            false,
            PathUtilities.resolve('.')
        );
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.baseUrl(config.name), false, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, DefaultEnvKeys.ENV, false, PathUtilities.resolve('.'));
        await EnvUtilities.addProjectVariableKey(
            config.name,
            environmentModel,
            DefaultEnvKeys.domain(config.frontendName),
            false,
            PathUtilities.resolve('.')
        );
    }
}