
import { Type } from '@nestjs/common';

import { APPS_DIRECTORY_NAME, BASE_TS_CONFIG_FILE_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, NEST_CLI_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, WEBPACK_CONFIG } from '../../../constants';
import { DbType, DbUtilities, defaultPortForDbType } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NestUtilities } from '../../../nest';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsUtilities } from '../../../ts';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath, Path } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new nest js api.
 */
type AddNestConfiguration = AddConfiguration & {
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
 * Command that handles adding a nest api to the monorepo.
 */
export class AddNestCommand extends BaseAddCommand<AddNestConfiguration> {

    private readonly dbNpmPackages: Record<DbType, NpmPackage[]> = {
        [DbType.POSTGRES]: [NpmPackage.PG],
        [DbType.MARIADB]: [NpmPackage.MYSQL_2]
    };

    protected override configQuestions: QuestionsFor<OmitStrict<AddNestConfiguration, keyof AddConfiguration>> = {
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
        const config: AddNestConfiguration = await this.getConfig();
        const { dbServiceName, databaseName, dbType } = await DbUtilities.configureDb(config.name, undefined, getPath('.'));
        const root: Path = await this.createProject(config);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createNestDatasource(dbServiceName, databaseName, dbType, root, config.name);
        await this.updateMainTs(root, config.port);

        await Promise.all([
            FsUtilities.rm(getPath(root, '.prettierrc')),
            FsUtilities.rm(getPath(root, 'src', 'app.controller.ts')),
            FsUtilities.rm(getPath(root, 'src', 'app.controller.spec.ts')),
            FsUtilities.rm(getPath(root, 'src', 'app.service.ts')),
            EslintUtilities.setupProjectEslint(root, true, 'tsconfig.json'),
            this.setupTsConfig(config.name),
            this.updatePackageJson(config.name),
            this.updateNestCliJson(root),
            this.setupSwagger(root, config.name),
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
                config.subDomain
            ),
            this.createDockerfile(root, config),
            this.createWebpackConfig(root)
        ]);

        await NpmUtilities.install(
            config.name,
            [
                NpmPackage.CLASS_VALIDATOR,
                NpmPackage.CLASS_TRANSFORMER,
                NpmPackage.NEST_JS_SWAGGER,
                NpmPackage.NEST_JS_TYPEORM,
                NpmPackage.TYPEORM,
                ...this.dbNpmPackages[dbType]
            ]
        );
    }

    private async createWebpackConfig(root: Path): Promise<void> {
        await FsUtilities.createFile(
            getPath(root, WEBPACK_CONFIG),
            [
                '/* eslint-disable jsdoc/require-param-description */',
                '/* eslint-disable jsdoc/require-returns-description */',
                '/* eslint-disable jsdoc/no-types */',
                '/* eslint-disable jsdoc/require-description */',
                '',
                'const webpack = require(\'webpack\');',
                '',
                '/**',
                ' * @param {import(\'webpack\').Configuration} config',
                ' * @returns {import(\'webpack\').Configuration}',
                ' */',
                'module.exports = (config) => {',
                '    const existingPlugins = config.plugins ?? [];',
                '    return {',
                '        ...config,',
                '        plugins: [',
                '            ...existingPlugins,',
                '            new webpack.IgnorePlugin({',
                '                resourceRegExp: /^pg-native$|^cloudflare:sockets$/',
                '            })',
                '        ]',
                '    };',
                '};'
            ]
        );
    }

    private async setupSwagger(root: Path, name: string): Promise<void> {
        const mainPath: Path = getPath(root, 'src', 'main.ts');
        await TsUtilities.addBelowImports(
            mainPath,
            [
                'function setupSwagger(app: NestExpressApplication): void {',
                '\tconst config: Omit<OpenAPIObject, \'paths\'> = new DocumentBuilder()',
                `\t\t.setTitle('${name}')`,
                '\t\t.setVersion(\'1.0\')',
                '\t\t.addBearerAuth()',
                '\t\t.build();',
                '',
                '\tconst document: OpenAPIObject = SwaggerModule.createDocument(app, config);',
                '\tSwaggerModule.setup(\'api\', app, document);',
                '\tSwaggerModule.setup(\'api-json\', app, document);',
                '}'
            ]
        );
        await FsUtilities.replaceInFile(
            mainPath,
            // eslint-disable-next-line sonar/no-duplicate-string
            '    app.enableCors();',
            [
                '    app.enableCors();',
                '',
                '    setupSwagger(app);'
            ].join('\n')
        );
        await TsUtilities.addImportStatements(
            mainPath,
            [
                { defaultImport: false, element: 'OpenAPIObject', path: NpmPackage.NEST_JS_SWAGGER },
                { defaultImport: false, element: 'DocumentBuilder', path: NpmPackage.NEST_JS_SWAGGER },
                { defaultImport: false, element: 'SwaggerModule', path: NpmPackage.NEST_JS_SWAGGER }
            ]
        );
    }

    private async updateNestCliJson(root: Path): Promise<void> {
        await NestUtilities.updateNestCliJson(
            getPath(root, NEST_CLI_FILE_NAME),
            {
                compilerOptions: {
                    builder: 'webpack'
                }
            }
        );
    }

    private async createProject(config: AddNestConfiguration): Promise<Path> {
        // eslint-disable-next-line no-console
        console.log('Creates the base app');
        NestUtilities.runCommand(
            getPath(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            {
                '--skip-git': true,
                '--language': 'TS',
                '--package-manager': 'npm',
                '--skip-install': true
            }
        );
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));

        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'modules'));
        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'utilities'));
        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'decorators'));
        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'guards'));
        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'migrations'));
        await FsUtilities.mkdir(getPath(newProject.path, 'src', 'assets'));

        const appModuleTs: Path = getPath(newProject.path, 'src', 'app.module.ts');
        await FsUtilities.replaceInFile(appModuleTs, '\nimport { AppController } from \'./app.controller\';', '');
        await FsUtilities.replaceInFile(appModuleTs, '\nimport { AppService } from \'./app.service\';', '');
        await FsUtilities.replaceInFile(appModuleTs, 'AppService', '');
        await FsUtilities.replaceInFile(appModuleTs, 'AppController', '');

        await FsUtilities.rm(getPath(newProject.path, ESLINT_CONFIG_FILE_NAME));

        return newProject.path;
    }

    private async setupTsConfig(projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
                compilerOptions: {
                    removeComments: undefined,
                    emitDecoratorMetadata: undefined,
                    experimentalDecorators: undefined,
                    forceConsistentCasingInFileNames: undefined,
                    allowSyntheticDefaultImports: undefined,
                    sourceMap: undefined,
                    skipLibCheck: undefined,
                    noImplicitAny: undefined,
                    noFallthroughCasesInSwitch: undefined
                }
            }
        );
        await NpmUtilities.updatePackageJson(
            projectName,
            {
                main: `dist/${APPS_DIRECTORY_NAME}/${projectName}/src/main.js`,
                types: `dist/${APPS_DIRECTORY_NAME}/${projectName}/src/main.d.ts`
            }
        );
    }

    private async updatePackageJson(name: string): Promise<void> {
        await NpmUtilities.updatePackageJson(name, {
            license: 'MIT',
            scripts: {
                format: undefined
            },
            devDependencies: {
                '@eslint/eslintrc': undefined,
                '@eslint/js': undefined,
                eslint: undefined,
                'eslint-config-prettier': undefined,
                'eslint-plugin-prettier': undefined,
                prettier: undefined,
                'typescript-eslint': undefined
            }
        });
        await NpmUtilities.install(name, []);
    }

    private async updateMainTs(root: Path, port: number): Promise<void> {
        const mainPath: Path = getPath(root, 'src', 'main.ts');
        await FsUtilities.replaceInFile(mainPath, 'env.PORT', 'env[\'PORT\']');
        await FsUtilities.replaceInFile(mainPath, '?? 3000', `?? ${port}`);
        await FsUtilities.replaceInFile(mainPath, 'async function bootstrap() {', 'async function bootstrap(): Promise<void> {');
        await FsUtilities.replaceInFile(mainPath, 'bootstrap();', '\nvoid bootstrap();');
        await FsUtilities.replaceInFile(
            mainPath,
            '  const app = await NestFactory.create(AppModule);',
            [
                '    const app: NestExpressApplication = await NestFactory.create(AppModule, { abortOnError: false });',
                '',
                '    app.set(\'trust proxy\', 1);',
                '    app.useGlobalPipes(',
                '        new ValidationPipe({',
                '            transform: true,',
                '            forbidUnknownValues: true,',
                '            whitelist: true,',
                '            forbidNonWhitelisted: true',
                '        })',
                '    );',
                '    const reflector: Reflector = app.get(Reflector);',
                '    app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));',
                '    app.enableCors();',
                ''
            ].join('\n')
        );
        await TsUtilities.addImportStatements(
            mainPath,
            [
                { defaultImport: false, element: 'NestExpressApplication', path: '@nestjs/platform-express' },
                { defaultImport: false, element: 'ValidationPipe', path: '@nestjs/common' },
                { defaultImport: false, element: 'Reflector', path: '@nestjs/core' },
                { defaultImport: false, element: 'ClassSerializerInterceptor', path: '@nestjs/common' }
            ]
        );
    }

    private async createDockerfile(root: string, config: AddNestConfiguration): Promise<void> {
        await FsUtilities.createFile(
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
                `COPY --from=build /home/node/root/${APPS_DIRECTORY_NAME}/${config.name}/dist ./`,
                'CMD node main'
            ]
        );
    }

    private async createNestDatasource(
        dbServiceName: string,
        databaseName: string,
        dbType: DbType,
        root: Path,
        projectName: string
    ): Promise<void> {
        const DB_TYPE_PLACEHOLDER: string = 'DB_TYPE_PLACEHOLDER';
        const DB_HOST_PLACEHOLDER: string = 'DB_HOST_PLACEHOLDER';
        const DB_USERNAME_PLACEHOLDER: string = 'DB_USERNAME_PLACEHOLDER';
        const DB_PASSWORD_PLACEHOLDER: string = 'DB_PASSWORD_PLACEHOLDER';
        const DB_DATABASE_PLACEHOLDER: string = 'DB_DATABASE_PLACEHOLDER';

        const appModuleTs: Path = getPath(root, 'src', 'app.module.ts');
        await NestUtilities.addModuleImports(
            appModuleTs,
            [
                `TypeOrmModule.forRoot({
            type: ${DB_TYPE_PLACEHOLDER},
            host: ${DB_HOST_PLACEHOLDER},
            port: ${defaultPortForDbType[dbType]},
            username: ${DB_USERNAME_PLACEHOLDER},
            password: ${DB_PASSWORD_PLACEHOLDER},
            database: ${DB_DATABASE_PLACEHOLDER},
            autoLoadEntities: true,
            synchronize: true,
            logging: false
        })` as unknown as Type<unknown>
            ]
        );
        await TsUtilities.addImportStatements(
            appModuleTs,
            [
                { defaultImport: false, element: 'TypeOrmModule', path: NpmPackage.NEST_JS_TYPEORM },
                { defaultImport: false, element: 'environment', path: './environment/environment' }
            ]
        );
        await FsUtilities.replaceInFile(appModuleTs, DB_TYPE_PLACEHOLDER, `'${dbType}'`);
        await FsUtilities.replaceInFile(appModuleTs, '\'TypeOrmModule', 'TypeOrmModule');
        await FsUtilities.replaceInFile(appModuleTs, ')\'', ')');
        await FsUtilities.replaceAllInFile(
            appModuleTs,
            DB_HOST_PLACEHOLDER,
            `environment.${DefaultEnvKeys.dbHost(dbServiceName)}`
        );
        await FsUtilities.replaceAllInFile(
            appModuleTs,
            DB_USERNAME_PLACEHOLDER,
            `environment.${DefaultEnvKeys.dbUser(dbServiceName, databaseName)}`
        );
        await FsUtilities.replaceAllInFile(
            appModuleTs,
            DB_PASSWORD_PLACEHOLDER,
            `environment.${DefaultEnvKeys.dbPassword(dbServiceName, databaseName)}`
        );
        await FsUtilities.replaceAllInFile(
            appModuleTs,
            DB_DATABASE_PLACEHOLDER,
            `environment.${DefaultEnvKeys.dbName(dbServiceName, databaseName)}`
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
}