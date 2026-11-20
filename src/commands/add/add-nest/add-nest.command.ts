import { APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, NEST_CLI_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities, defaultPortForDbType } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NestUtilities } from '../../../nest';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new nest js api.
 */
type AddNestConfiguration = AddConfiguration & {
    /**
     * The port the api listens on during development.
     * @default 3000
     */
    port: number,
    /**
     * The sub domain the api is reached under. Without one, Monux assumes the root domain and its www sub domain.
     */
    subDomain?: string
};

/**
 * The names of the variables of the database of the api.
 */
type DbKeys = {
    /**
     * The host of the database.
     */
    dbHostKey: EnvironmentVariableKey,
    /**
     * The user of the api.
     */
    dbUserKey: EnvironmentVariableKey,
    /**
     * The password of the user.
     */
    dbPasswordKey: EnvironmentVariableKey,
    /**
     * The name of the database.
     */
    dbNameKey: EnvironmentVariableKey
};

// the driver TypeORM reaches each database with
const DB_PACKAGES: Record<DbType, NpmPackage> = {
    [DbType.POSTGRES]: NpmPackage.PG,
    [DbType.MARIADB]: NpmPackage.MYSQL_2
};

// what Nest lints and formats with, which the eslint of the workspace replaces
const LINT_FILES: string[] = ['.oxlintrc.json', '.prettierrc', ESLINT_CONFIG_FILE_NAME];

// the entry files "nest new" writes, with inferred types and the untyped tsconfig jest reads, which the eslint of the
// workspace would otherwise flag. The code the developer adds is linted like every other project
const NEST_ESLINT_EXCEPTIONS: string = [
    '    ...baseConfig,',
    '    {',
    '        files: [\'src/main.ts\', \'jest.config.ts\'],',
    '        rules: {',
    '            \'typescript/typedef\': \'off\',',
    '            \'typescript/explicit-function-return-type\': \'off\',',
    '            \'typescript/no-unsafe-assignment\': \'off\',',
    '            \'typescript/no-unsafe-member-access\': \'off\',',
    '            \'typescript/no-unsafe-argument\': \'off\'',
    '        }',
    '    },'
].join('\n');

/**
 * Command that handles adding a nest api to the monorepo: a Nest project as "nest new" generates it, with its database,
 * its environment and its image as part of the workspace, and its OpenAPI document, see GOALS.md.
 */
export class AddNestCommand extends BaseAddCommand<AddNestConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<AddNestConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'Port',
            name: 'port',
            validate: (v?: number) => !!v,
            default: 3000
        },
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'Sub domain'
        }
    };

    protected override async run(): Promise<void> {
        const config: AddNestConfiguration = await this.getConfig();
        const { dbComposeServiceName, databaseName, dbType } = await DbUtilities.configureDb(
            config.name,
            undefined,
            PathUtilities.resolve('.')
        );
        const dbKeys: DbKeys = {
            dbHostKey: DefaultEnvKeys.dbHost(dbComposeServiceName),
            dbUserKey: DefaultEnvKeys.dbUser(dbComposeServiceName, databaseName),
            dbPasswordKey: DefaultEnvKeys.dbPassword(dbComposeServiceName, databaseName),
            dbNameKey: DefaultEnvKeys.dbName(dbComposeServiceName, databaseName)
        };

        const root: Path = await this.createProject(config);
        LogUtilities.step('Adding the database, the environment and the image of the workspace');
        await TemplateUtilities.write('nest', root, {
            name: config.name,
            dbType: dbType === DbType.POSTGRES ? 'postgres' : 'mariadb',
            dbPort: String(defaultPortForDbType[dbType]),
            ...dbKeys
        });
        await NpmUtilities.install(
            config.name,
            [NpmPackage.NEST_JS_TYPEORM, NpmPackage.TYPEORM, DB_PACKAGES[dbType], NpmPackage.NEST_JS_SWAGGER]
        );
        await this.setupEnvironment(root, config, dbKeys);
        await this.connect(root, config.name);
        await this.compileFromWorkspaceRoot(root, config.name);
        await this.addToCompose(root, config);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));

        LogUtilities.step('Setting up eslint');
        await EslintUtilities.setupProjectEslint(root, true, 'tsconfig.json');
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, ESLINT_CONFIG_FILE_NAME),
            '    ...baseConfig,',
            NEST_ESLINT_EXCEPTIONS
        );
        await EslintUtilities.fix(root);
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async createProject(config: AddNestConfiguration): Promise<Path> {
        LogUtilities.step('Creating the Nest project');
        await NestUtilities.runCommand(
            PathUtilities.resolve(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            {
                '--skip-git': true,
                '--language': 'TS',
                '--package-manager': 'npm',
                '--type': 'cjs',
                '--skip-install': true,
                '--no-observe': true
            }
        );
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await Promise.all(LINT_FILES.map(f => FsUtilities.rm(PathUtilities.resolve(project.path, f))));
        await NpmUtilities.updatePackageJson(config.name, {
            scripts: {
                format: undefined,
                lint: undefined,
                // see scripts/jest.mjs
                test: 'node --experimental-vm-modules scripts/jest.mjs',
                'test:watch': 'node --experimental-vm-modules scripts/jest.mjs --watch',
                'test:cov': 'node --experimental-vm-modules scripts/jest.mjs --coverage',
                'test:e2e': 'node --experimental-vm-modules scripts/jest.mjs --config ./test/jest-e2e.json'
            },
            devDependencies: {
                oxlint: undefined,
                'oxlint-tsgolint': undefined,
                prettier: undefined
            }
        });
        await NpmUtilities.install(config.name, []);
        return project.path;
    }

    private async setupEnvironment(root: Path, config: AddNestConfiguration, dbKeys: DbKeys): Promise<void> {
        await EnvUtilities.setupProjectEnvironment(root, true);
        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        const keys: EnvironmentVariableKey[] = [DefaultEnvKeys.ENV, DefaultEnvKeys.port(config.name), ...Object.values(dbKeys)];
        for (const key of keys) {
            await EnvUtilities.addProjectVariableKey(config.name, environmentModel, key, false, PathUtilities.resolve('.'));
        }
    }

    /**
     * Connects the api to the workspace: its database, the port of the workspace during development, traefik in front
     * of it, and its OpenAPI document.
     * @param root - The directory of the api.
     * @param name - The name of the api.
     */
    private async connect(root: Path, name: string): Promise<void> {
        const appModulePath: Path = PathUtilities.resolve(root, 'src', 'app.module.ts');
        await FsUtilities.replaceInFile(appModulePath, '  imports: [],', '  imports: [TypeOrmModule.forRoot(DATABASE_OPTIONS)],');
        await FsUtilities.updateFile(
            appModulePath,
            'import { TypeOrmModule } from \'@nestjs/typeorm\';\nimport { DATABASE_OPTIONS } from \'./database.options\';',
            'prepend'
        );

        const mainPath: Path = PathUtilities.resolve(root, 'src', 'main.ts');
        await FsUtilities.replaceInFile(
            mainPath,
            '  const app = await NestFactory.create(AppModule);',
            [
                '  const app = await NestFactory.create<NestExpressApplication>(AppModule);',
                '  // behind traefik, which forwards the address of the client',
                '  app.set(\'trust proxy\', 1);',
                '  // the OpenAPI document of the api, at /api and as json at /api-json',
                '  SwaggerModule.setup(\'api\', app, () => SwaggerModule.createDocument(',
                '    app,',
                `    new DocumentBuilder().setTitle('${name}').build()`,
                '  ));'
            ].join('\n')
        );
        await FsUtilities.replaceInFile(
            mainPath,
            'await app.listen(process.env.PORT ?? 3000);',
            `await app.listen(environment.env === 'dev' ? environment.${DefaultEnvKeys.port(name)} : 3000);`
        );
        await FsUtilities.updateFile(
            mainPath,
            [
                'import { NestExpressApplication } from \'@nestjs/platform-express\';',
                'import { DocumentBuilder, SwaggerModule } from \'@nestjs/swagger\';',
                'import { environment } from \'./environment/environment\';'
            ].join('\n'),
            'prepend'
        );
    }

    /**
     * Compiles the api from the root of the workspace, as it imports the global-environment.model.ts there, which a
     * rootDir of src refuses. The output is below dist/apps/<name>/src then, so what Nest starts from dist points there.
     * @param root - The directory of the api.
     * @param name - The name of the api.
     */
    private async compileFromWorkspaceRoot(root: Path, name: string): Promise<void> {
        await TsConfigUtilities.updateTsConfig(name, { compilerOptions: { rootDir: '../..' } });
        await TsConfigUtilities.update(PathUtilities.resolve(root, 'tsconfig.build.json'), { compilerOptions: { rootDir: '../..' } });
        const output: string = `${APPS_DIRECTORY_NAME}/${name}/src`;
        await NestUtilities.updateNestCliJson(PathUtilities.resolve(root, NEST_CLI_FILE_NAME), { entryFile: `${output}/main` });
        await NpmUtilities.updatePackageJson(name, { scripts: { 'start:prod': `node dist/${output}/main` } });
    }

    private async addToCompose(root: Path, config: AddNestConfiguration): Promise<void> {
        const projectDirectory: string = PathUtilities.getRelative(PathUtilities.resolve('.'), root);
        await DockerUtilities.addServiceToCompose(
            {
                name: config.name,
                build: {
                    dockerfile: `./${projectDirectory}/${DOCKER_FILE_NAME}`,
                    context: '.'
                },
                envFile: [`./${projectDirectory}/.env`]
            },
            3000,
            config.port,
            true,
            false,
            config.subDomain
        );
    }
}