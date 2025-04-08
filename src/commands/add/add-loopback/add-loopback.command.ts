import { APPS_DIRECTORY_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, GIT_IGNORE_FILE_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { DbUtilities } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { LbDatabaseConfig, LoopbackUtilities } from '../../../loopback';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsUtilities } from '../../../ts';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath, toKebabCase, toPascalCase } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new loopback api.
 */
export type AddLoopbackConfiguration = AddConfiguration & {
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
        subDomain: {
            type: 'input',
            message: 'sub domain',
            required: false
        },
        defaultUserEmail: {
            type: 'input',
            message: 'Email of the default user',
            required: true,
            default: async () => (await FsUtilities.readFile(PROD_DOCKER_COMPOSE_FILE_NAME)).split('.acme.email=')[1].split('\n')[0]
        },
        defaultUserPassword: {
            type: 'input',
            message: 'Password of the default user',
            required: true,
            validate: (v) => v.length >= 12 ? true : 'Password must be at least 12 characters strong'
        },
        frontendName: {
            type: 'input',
            message: 'Name of the frontend where the reset password ui is implemented',
            required: true
        }
    };

    override async run(): Promise<void> {
        const config: AddLoopbackConfiguration = await this.getConfig();
        const { dbServiceName, databaseName } = await DbUtilities.configureDb(config.name);
        const root: string = await this.createProject(config);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createLoopbackDatasource(dbServiceName, databaseName, root, config.name);

        await Promise.all([
            this.setupTsConfig(config.name),
            this.updateApplicationTs(root),
            this.updateIndexTs(root, config.port),
            this.updateOpenApiSpec(root, config.port),
            EslintUtilities.setupProjectEslint(root, true, TS_CONFIG_FILE_NAME),
            DockerUtilities.addServiceToCompose(
                {
                    name: config.name,
                    build: {
                        dockerfile: `./${root}/${DOCKER_FILE_NAME}`,
                        context: '.'
                    },
                    volumes: [{ path: `/${config.name}` }]
                },
                3000,
                true,
                config.subDomain
            ),
            this.updateDockerFile(root)
        ]);

        await NpmUtilities.updatePackageJson(config.name, {
            scripts: {
                start: 'npm run start:watch',
                'start:watch': 'tsc-watch --target es2017 --outDir ./dist --onSuccess \"node .\"'
            }
        });
        await NpmUtilities.install(config.name, [NpmPackage.TSC_WATCH], true);
        await LoopbackUtilities.setupAuth(root, config, dbServiceName);
        await LoopbackUtilities.setupLogging(root, config.name);
        await LoopbackUtilities.setupChangeSets(root, config.name);
        await LoopbackUtilities.setupMigrations(root, config.name);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name);
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml');
    }

    private async updateDockerFile(root: string): Promise<void> {
        // TODO: Update loopback 4 Dockerfile
        await FsUtilities.updateFile(getPath(root, DOCKER_FILE_NAME), '', 'append');
    }

    private async updateIndexTs(root: string, port: number): Promise<void> {
        const indexPath: string = getPath(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(indexPath, '  console.log(`Try ${url}/ping`);\n', '');
        await FsUtilities.replaceInFile(
            indexPath,
            '  await app.boot();',
            '  await app.boot();\n  await app.migrateSchema({ existingSchema: \'alter\' });'
        );
        await FsUtilities.replaceInFile(indexPath, 'env.PORT', 'env[\'PORT\']');
        await FsUtilities.replaceInFile(indexPath, 'env.HOST', 'env[\'HOST\']');
        await FsUtilities.replaceInFile(indexPath, '?? 3000', `?? ${port}`);
    }

    private async updateOpenApiSpec(root: string, port: number): Promise<void> {
        const openApiPath: string = getPath(root, 'src', 'openapi-spec.ts');
        await FsUtilities.replaceInFile(openApiPath, 'env.PORT', 'env[\'PORT\']');
        await FsUtilities.replaceInFile(openApiPath, 'env.HOST', 'env[\'HOST\']');
        await FsUtilities.replaceInFile(openApiPath, '?? 3000', `?? ${port}`);
    }

    private async updateApplicationTs(root: string): Promise<void> {
        const applicationPath: string = getPath(root, 'src', 'application.ts');
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

    /**
     * Creates a loopback datasource.
     * @param dbServiceName - The name of the docker database service.
     * @param databaseName - The name of the database.
     * @param root - The root of the loopback project.
     * @param projectName - The name of the loopback app.
     */
    private async createLoopbackDatasource(dbServiceName: string, databaseName: string, root: string, projectName: string): Promise<void> {
        const lbDatabaseConfig: LbDatabaseConfig = {
            name: databaseName,
            connector: 'postgres' as 'postgresql'
        } as LbDatabaseConfig;
        await NpmUtilities.install(projectName, [NpmPackage.LOOPBACK_CONNECTOR_POSTGRES]);
        await LoopbackUtilities.runCommand(root, `datasource ${databaseName}`, { '--config': lbDatabaseConfig, '--yes': true });

        const PASSWORD_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbPassword(dbServiceName, databaseName);
        const USER_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbUser(dbServiceName, databaseName);
        const DATABASE_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbName(dbServiceName, databaseName);
        const HOST_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbHost(dbServiceName);

        const dataSourcePath: string = getPath(root, 'src', 'datasources', `${toKebabCase(databaseName)}.datasource.ts`);
        await TsUtilities.addImportStatements(
            dataSourcePath,
            [{ defaultImport: false, element: 'environment', path: '../environment/environment' }]
        );
        await FsUtilities.replaceInFile(dataSourcePath, 'postgres', 'postgresql');
        await FsUtilities.replaceInFile(
            dataSourcePath,
            // eslint-disable-next-line sonar/no-duplicate-string
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
            `\n  static readonly INJECTION_KEY: string = 'datasources.${databaseName}';`
        );
        await FsUtilities.replaceInFile(
            dataSourcePath,
            // eslint-disable-next-line stylistic/max-len
            `  constructor(\n    @inject('datasources.config.${databaseName}', {optional: true})\n    dsConfig: object = config,\n  ) {\n    super(dsConfig);\n  }`,
            '    constructor() {\n        super(config);\n    }'
        );
        const environmentModel: string = getPath(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);

        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, PASSWORD_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, USER_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, DATABASE_ENV_VARIABLE, true);
        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, HOST_ENV_VARIABLE, true);
    }

    private async createProject(config: AddLoopbackConfiguration): Promise<string> {
        await LoopbackUtilities.runCommand(getPath(APPS_DIRECTORY_NAME), `new ${config.name}`, {
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
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name);
        await Promise.all([
            FsUtilities.rm(getPath(newProject.path, 'src', '__tests__')),
            FsUtilities.rm(getPath(newProject.path, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(getPath(newProject.path, 'DEVELOPING.md')),
            FsUtilities.rm(getPath(newProject.path, 'src', 'controllers', 'ping.controller.ts')),
            FsUtilities.updateFile(getPath(newProject.path, 'src', 'controllers', 'index.ts'), '', 'replace')
        ]);
        const indexTs: string = getPath(newProject.path, 'src', 'index.ts');
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
        return newProject.path;
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