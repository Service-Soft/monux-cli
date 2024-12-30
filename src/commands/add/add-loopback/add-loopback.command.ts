import { Dirent } from 'fs';
import path from 'path';

import { APPS_DIRECTORY_NAME, DOCKER_COMPOSE_FILE_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, GIT_IGNORE_FILE_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { DbUtilities, PostgresDbConfig, postgresDbConfigQuestions } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, InquirerUtilities, QuestionsFor } from '../../../encapsulation';
import { EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { LbDatabaseConfig, LoopbackUtilities } from '../../../loopback';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsUtilities } from '../../../ts';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { toKebabCase, toPascalCase, toSnakeCase } from '../../../utilities';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for selecting a database.
 */
type DbConfig = {
    /**
     * The database to be used by the api.
     */
    database: Omit<string, 'NEW'> | 'NEW'
};

/**
 * Configuration for adding a new loopback api.
 */
export type AddLoopbackConfiguration = AddConfiguration & {
    /**
     * The domain that the website should be reached under.
     */
    domain: string,
    /**
     *
     */
    baseUrl: string,
    /**
     *
     */
    frontendName: string,
    /**
     * The port that should be used by the application.
     * @default 3000
     */
    port: number,
    /**
     *
     */
    defaultUserEmail: string,
    /**
     *
     */
    defaultUserPassword: string
};

/**
 * Command that handles adding a loopback api to the monorepo.
 */
export class AddLoopbackCommand extends AddCommand<AddLoopbackConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<AddLoopbackConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 3000
        },
        domain: {
            type: 'input',
            message: 'domain',
            default: 'localhost:3000',
            required: true
        },
        baseUrl: {
            type: 'input',
            message: 'base url',
            default: 'http://localhost:3000',
            required: true
        },
        defaultUserEmail: {
            type: 'input',
            message: 'Email of the default user',
            required: true,
            default: async () => (await FsUtilities.readFile(DOCKER_COMPOSE_FILE_NAME)).split('.acme.email=')[1].split('\n')[0]
        },
        defaultUserPassword: {
            type: 'input',
            message: 'Password of the default user',
            required: true,
            validate: (v) => v.length >= 12
        },
        frontendName: {
            type: 'input',
            message: 'Name of the frontend where the reset password ui is implemented',
            required: true
        }
    };

    override async run(): Promise<void> {
        const config: AddLoopbackConfiguration = await this.getConfig();

        const dbName: string = await this.configureDb();
        const root: string = await this.createProject(config);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createLoopbackDatasource(dbName, root, config.name);

        await Promise.all([
            this.setupTsConfig(config.name),
            this.updateApplicationTs(root),
            this.updateIndexTs(root),
            this.updateOpenApiSpec(root),
            EslintUtilities.setupProjectEslint(root, true, false, TS_CONFIG_FILE_NAME),
            DockerUtilities.addServiceToCompose(
                {
                    name: config.name,
                    build: {
                        dockerfile: `./${root}/${DOCKER_FILE_NAME}`,
                        context: '.'
                    },
                    volumes: [{ path: `/${config.name}` }],
                    labels: DockerUtilities.getTraefikLabels(config.name, 3000)
                },
                config.domain,
                config.baseUrl
            )
        ]);

        await LoopbackUtilities.setupAuth(root, config, dbName);
        await LoopbackUtilities.setupLogging(root, config.name);
        await LoopbackUtilities.setupChangeSets(root, config.name);

        const app: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        await EnvUtilities.buildEnvironmentFileForApp(app, '', false);
    }

    private async updateIndexTs(root: string): Promise<void> {
        const indexPath: string = path.join(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(indexPath, '  console.log(`Try ${url}/ping`);\n', '');
        await FsUtilities.replaceInFile(
            indexPath,
            '  await app.boot();',
            '  await app.boot();\n  await app.migrateSchema({ existingSchema: \'alter\' });'
        );
        await FsUtilities.replaceInFile(
            indexPath,
            'env.PORT',
            'env[\'PORT\']'
        );
        await FsUtilities.replaceInFile(
            indexPath,
            'env.HOST',
            'env[\'HOST\']'
        );
    }

    private async updateOpenApiSpec(root: string): Promise<void> {
        const openApiPath: string = path.join(root, 'src', 'openapi-spec.ts');
        await FsUtilities.replaceInFile(
            openApiPath,
            'env.PORT',
            'env[\'PORT\']'
        );
        await FsUtilities.replaceInFile(
            openApiPath,
            'env.HOST',
            'env[\'HOST\']'
        );
    }

    private async updateApplicationTs(root: string): Promise<void> {
        const applicationPath: string = path.join(root, 'src', 'application.ts');
        await FsUtilities.replaceInFile(
            applicationPath,
            'BootMixin(RestApplication)',
            'BootMixin(ServiceMixin(RepositoryMixin(RestApplication)))'
        );
        await TsUtilities.addImportStatements(
            applicationPath,
            [
                { defaultImport: false, element: 'ServiceMixin', path: '@loopback/service-proxy' },
                { defaultImport: false, element: 'RepositoryMixin', path: '@loopback/repository' }
            ]
        );
    }

    private async createLoopbackDatasource(dbName: string, root: string, name: string): Promise<void> {
        const lbDatabaseConfig: LbDatabaseConfig = {
            name: dbName,
            connector: 'postgresql'
        } as LbDatabaseConfig;
        await NpmUtilities.install(name, [NpmPackage.LOOPBACK_CONNECTOR_POSTGRES]);
        await LoopbackUtilities.runCommand(root, `datasource ${dbName}`, { '--config': lbDatabaseConfig, '--yes': true });

        const PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(dbName)}_password`;
        const USER_ENV_VARIABLE: string = `${toSnakeCase(dbName)}_user`;
        const DATABASE_ENV_VARIABLE: string = `${toSnakeCase(dbName)}_database`;
        const HOST_ENV_VARIABLE: string = `${toSnakeCase(dbName)}_host`;
        const dataSourcePath: string = path.join(root, 'src', 'datasources', `${toKebabCase(dbName)}.datasource.ts`);
        await TsUtilities.addImportStatements(
            dataSourcePath,
            [{ defaultImport: false, element: 'environment', path: '../environment/environment' }]
        );
        await FsUtilities.replaceInFile(
            dataSourcePath,
            'const config = {',
            [
                'const config = {',
                '  url: \'\',',
                `  host: environment.${HOST_ENV_VARIABLE},`,
                '  port: 5432,',
                `  user: environment.${USER_ENV_VARIABLE},`,
                `  password: environment.${PASSWORD_ENV_VARIABLE},`,
                `  database: environment.${DATABASE_ENV_VARIABLE},`
            ].join('\n')
        );
        await FsUtilities.replaceInFile(
            dataSourcePath,
            '  static dataSourceName = ',
            '\n  static readonly dataSourceName: string = '
        );
        await FsUtilities.replaceInFile(
            dataSourcePath,
            '  static readonly defaultConfig = config;',
            `\n  static readonly INJECTION_KEY: string = 'datasources.${dbName}';`
        );
        await FsUtilities.replaceInFile(
            dataSourcePath,
            // eslint-disable-next-line stylistic/max-len
            `  constructor(\n    @inject('datasources.config.${dbName}', {optional: true})\n    dsConfig: object = config,\n  ) {\n    super(dsConfig);\n  }`,
            '    constructor() {\n        super(config);\n    }'
        );
        const environmentModel: string = path.join(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);

        await EnvUtilities.addProjectVariableKey(name, environmentModel, PASSWORD_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(name, environmentModel, USER_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(name, environmentModel, DATABASE_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(name, environmentModel, HOST_ENV_VARIABLE, true);
    }

    private async configureDb(): Promise<string> {
        const selectDbQuestions: QuestionsFor<DbConfig> = {
            database: {
                type: 'select',
                message: 'Database',
                choices: ['NEW', ...(await DbUtilities.getAvailableDatabases()).map(db => db.name)],
                default: 'NEW'
            }
        };
        const db: Omit<string, 'NEW'> | 'NEW' = (await InquirerUtilities.prompt(selectDbQuestions)).database;
        if (db === 'NEW') {
            const dbConfig: PostgresDbConfig = await InquirerUtilities.prompt(postgresDbConfigQuestions);
            await DbUtilities.createPostgresDatabase(dbConfig.name, dbConfig.database);
            return dbConfig.name;
        }
        return db as string;
    }

    private async createProject(config: AddLoopbackConfiguration): Promise<string> {
        await LoopbackUtilities.runCommand(APPS_DIRECTORY_NAME, `new ${config.name}`, {
            '--yes': true,
            '--config': {
                docker: true,
                eslint: false,
                mocha: true,
                loopbackBuild: true,
                prettier: false,
                vscode: false
            }
        });
        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        await Promise.all([
            FsUtilities.rm(path.join(root, 'src', '__tests__')),
            FsUtilities.rm(path.join(root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(path.join(root, 'DEVELOPING.md')),
            FsUtilities.rm(path.join(root, 'src', 'controllers', 'ping.controller.ts')),
            FsUtilities.updateFile(path.join(root, 'src', 'controllers', 'index.ts'), '', 'replace')
        ]);
        const indexTs: string = path.join(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(
            indexTs,
            'async function main(options: ApplicationConfig = {})',
            `async function main(options: ApplicationConfig = {}): Promise<${toPascalCase(config.name)}Application>`
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'const app = new ',
            `const app: ${toPascalCase(config.name)}Application = new `
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'const url = app.restServer.url;',
            'const url: string | undefined = app.restServer.url;'
        );
        await FsUtilities.replaceInFile(
            indexTs,
            'const config = {',
            'const config: ApplicationConfig = {'
        );
        await FsUtilities.replaceInFile(
            indexTs,
            '|| \'127.0.0.1\'',
            '?? \'127.0.0.1\''
        );
        return root;
    }

    private async setupTsConfig(projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: ['../../tsconfig.base.json', '@loopback/build/config/tsconfig.common.json'],
                compilerOptions: { rootDir: undefined }
            }
        );
        await NpmUtilities.updatePackageJson(
            projectName,
            {
                main: `dist/${APPS_DIRECTORY_NAME}/${projectName}/src/index.js`,
                types: `dist/${APPS_DIRECTORY_NAME}/${projectName}/src/index.d.ts`
            }
        );
    }
}