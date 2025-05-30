import { loopbackViteContent } from './loopback-vite.content';
import { loopbackWebpackContent } from './loopback-webpack.content';
import { APPS_DIRECTORY_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, GIT_IGNORE_FILE_NAME, TS_CONFIG_FILE_NAME, WEBPACK_CONFIG, BASE_TS_CONFIG_FILE_NAME, VITE_CONFIG } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { LbDatabaseConfig, LoopbackUtilities } from '../../../loopback';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsUtilities } from '../../../ts';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath, Path, toKebabCase, toPascalCase } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand } from '../models';
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
export class AddLoopbackCommand extends BaseAddCommand<AddLoopbackConfiguration> {
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
            default: async () => (await FsUtilities.readFile(getPath(PROD_DOCKER_COMPOSE_FILE_NAME)))
                .split('.acme.email=')[1]
                .split('\n')[0]
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
        const { dbServiceName, databaseName, dbType } = await DbUtilities.configureDb(config.name, DbType.POSTGRES, getPath('.'));
        if (dbType !== DbType.POSTGRES) {
            throw new Error('Error adding the app: Currently loopback only supports postgres as its database.');
        }
        const root: Path = await this.createProject(config);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createLoopbackDatasource(dbServiceName, databaseName, root, config.name);

        await Promise.all([
            this.setupTsConfig(config.name),
            this.updateApplicationTs(root, databaseName),
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
                    volumes: [`/${config.name}`]
                },
                3000,
                config.port,
                true,
                false,
                config.subDomain
            ),
            this.updateDockerFile(root, config)
            // this.setupVite(root, config.name)
            // this.setupWebpack(root, config.name) TODO: enable
        ]);

        await NpmUtilities.updatePackageJson(config.name, {
            scripts: {
                start: 'npm run start:watch',
                'start:watch': 'tsc-watch --target es2017 --outDir ./dist --onSuccess \"node .\"'
            }
        });
        await NpmUtilities.install(config.name, [NpmPackage.TSC_WATCH], true);
        await LoopbackUtilities.setupAuth(root, config, databaseName);
        await LoopbackUtilities.setupLogging(root, config.name, databaseName);
        await LoopbackUtilities.setupChangeSets(root, config.name, databaseName);
        await LoopbackUtilities.setupMigrations(root, config.name);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', getPath('.'));
    }

    private async setupVite(root: Path, projectName: string): Promise<void> {
        await FsUtilities.createFile(getPath(root, VITE_CONFIG), loopbackViteContent);
        await NpmUtilities.install(projectName, [NpmPackage.VITE, NpmPackage.VITE_TS_CONFIG_PATHS], true);
        await NpmUtilities.updatePackageJson(projectName, {
            scripts: {
                'build:vite': 'vite build'
            }
        });
    }

    private async setupWebpack(root: Path, projectName: string): Promise<void> {
        await FsUtilities.createFile(getPath(root, WEBPACK_CONFIG), loopbackWebpackContent);
        await NpmUtilities.install(projectName, [NpmPackage.WEBPACK, NpmPackage.WEBPACK_CLI], true);
        await NpmUtilities.updatePackageJson(projectName, {
            scripts: {
                'build:webpack': 'webpack'
            }
        });
    }

    private async updateDockerFile(root: string, config: AddLoopbackConfiguration): Promise<void> {
        await FsUtilities.updateFile(
            getPath(root, DOCKER_FILE_NAME),
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
                `COPY --from=build /home/node/root/${APPS_DIRECTORY_NAME}/${config.name}/dist/${APPS_DIRECTORY_NAME}/${config.name} ./`,
                'COPY --from=build /home/node/root/node_modules ./node_modules', // TODO: get rid off
                'CMD node src'
            ],
            'replace'
        );
    }

    private async updateIndexTs(root: string, port: number): Promise<void> {
        const indexPath: Path = getPath(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(indexPath, '  console.log(`Try ${url}/ping`);\n', '');
        await FsUtilities.replaceInFile(
            indexPath,
            '  await app.boot();',
            [
                '  await app.boot();',
                '  await app.migrateSchema({ existingSchema: \'alter\' });'
            ].join('\n')
        );
        await FsUtilities.replaceInFile(indexPath, 'env.PORT', 'env[\'PORT\']');
        await FsUtilities.replaceInFile(indexPath, 'env.HOST', 'env[\'HOST\']');
        await FsUtilities.replaceInFile(indexPath, '?? 3000', `?? ${port}`);
        await TsUtilities.addImportStatements(indexPath, [{ defaultImport: false, element: 'Roles', path: './models' }]);
    }

    private async updateOpenApiSpec(root: string, port: number): Promise<void> {
        const openApiPath: Path = getPath(root, 'src', 'openapi-spec.ts');
        await FsUtilities.replaceInFile(openApiPath, 'env.PORT', 'env[\'PORT\']');
        await FsUtilities.replaceInFile(openApiPath, 'env.HOST', 'env[\'HOST\']');
        await FsUtilities.replaceInFile(openApiPath, '?? 3000', `?? ${port}`);
    }

    private async updateApplicationTs(root: string, dbName: string): Promise<void> {
        const applicationPath: Path = getPath(root, 'src', 'application.ts');
        await FsUtilities.replaceInFile(
            applicationPath,
            'BootMixin(RestApplication)',
            'BootMixin(ServiceMixin(RepositoryMixin(RestApplication)))'
        );
        await TsUtilities.addToConstructorBody(
            applicationPath,
            // eslint-disable-next-line stylistic/max-len
            `this.dataSource(${toPascalCase(dbName)}DataSource, 'db'); // "db" is the key under wich the datasource is registered in teh external components`
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
    private async createLoopbackDatasource(
        dbServiceName: string,
        databaseName: string,
        root: Path,
        projectName: string
    ): Promise<void> {
        const lbDatabaseConfig: LbDatabaseConfig = {
            name: databaseName,
            connector: 'postgres' as 'postgresql'
        } as LbDatabaseConfig;
        await NpmUtilities.install(projectName, [NpmPackage.LOOPBACK_CONNECTOR_POSTGRES]);
        await LoopbackUtilities.runCommand(root, `datasource ${databaseName}`, { '--config': lbDatabaseConfig, '--yes': true });

        const dataSourcePath: Path = getPath(root, 'src', 'datasources', `${toKebabCase(databaseName)}.datasource.ts`);
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
                `  host: environment.${DefaultEnvKeys.dbHost(dbServiceName)},`,
                '  port: 5432,',
                `  user: environment.${DefaultEnvKeys.dbUser(dbServiceName, databaseName)},`,
                `  password: environment.${DefaultEnvKeys.dbPassword(dbServiceName, databaseName)},`,
                `  database: environment.${DefaultEnvKeys.dbName(dbServiceName, databaseName)},`
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
        const environmentModel: Path = getPath(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);

        await EnvUtilities.addProjectVariableKey(
            projectName,
            environmentModel,
            DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            true,
            getPath('.')
        );
        await EnvUtilities.addProjectVariableKey(
            projectName,
            environmentModel,
            DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            true,
            getPath('.')
        );
        await EnvUtilities.addProjectVariableKey(projectName,
            environmentModel,
            DefaultEnvKeys.dbName(dbServiceName, databaseName),
            true,
            getPath('.'));
        await EnvUtilities.addProjectVariableKey(projectName, environmentModel, DefaultEnvKeys.dbHost(dbServiceName), true, getPath('.'));
    }

    private async createProject(config: AddLoopbackConfiguration): Promise<Path> {
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
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));
        await Promise.all([
            FsUtilities.rm(getPath(newProject.path, 'src', '__tests__')),
            FsUtilities.rm(getPath(newProject.path, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(getPath(newProject.path, 'DEVELOPING.md')),
            FsUtilities.rm(getPath(newProject.path, 'src', 'controllers', 'ping.controller.ts')),
            FsUtilities.updateFile(getPath(newProject.path, 'src', 'controllers', 'index.ts'), '', 'replace')
        ]);
        const indexTs: Path = getPath(newProject.path, 'src', 'index.ts');
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
                extends: [`../../${BASE_TS_CONFIG_FILE_NAME}`, '@loopback/build/config/tsconfig.common.json'],
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