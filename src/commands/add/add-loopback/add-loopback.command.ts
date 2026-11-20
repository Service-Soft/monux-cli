import { APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, GIT_IGNORE_FILE_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { LoopbackUtilities } from '../../../loopback';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new loopback api.
 */
export type AddLoopbackConfiguration = AddConfiguration & {
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

// what lb4 writes the way LoopBack writes code, which the eslint of the workspace would otherwise flag. The code the
// developer adds is linted like every other project
const LOOPBACK_ESLINT_EXCEPTIONS: string = [
    '    ...baseConfig,',
    '    // the static home page LoopBack serves, which is no Angular template',
    '    { ignores: [\'public\', \'dist\'] },',
    '    {',
    '        files: [\'**/*.ts\'],',
    '        rules: {',
    '            // "__tests__" is where LoopBack keeps its tests',
    '            \'unicorn/filename-case\': [\'warn\', { directoryRoots: [/(^|\\/)__tests__$/u] }]',
    '        }',
    '    },',
    '    {',
    '        // the entry files and the tests lb4 writes: types inferred, callbacks of promises and logs to the console',
    '        files: [\'src/index.ts\', \'src/migrate.ts\', \'src/openapi-spec.ts\', \'src/__tests__/**/*.ts\'],',
    '        rules: {',
    '            \'typescript/typedef\': \'off\',',
    '            \'typescript/explicit-function-return-type\': \'off\',',
    '            \'no-console\': \'off\',',
    '            \'promise/prefer-await-to-callbacks\': \'off\',',
    '            \'promise/prefer-await-to-then\': \'off\'',
    '        }',
    '    },',
    '    {',
    '        // the assertions of @loopback/testlab, which come without types',
    '        files: [\'src/__tests__/**/*.ts\'],',
    '        rules: {',
    '            \'typescript/no-unsafe-call\': \'off\'',
    '        }',
    '    },'
].join('\n');

/**
 * Command that handles adding a loopback api to the monorepo: a LoopBack project as lb4 generates it, with its Postgres
 * database, its environment and its image as part of the workspace, see GOALS.md.
 */
export class AddLoopbackCommand extends BaseAddCommand<AddLoopbackConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<AddLoopbackConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            name: 'port',
            message: 'Port',
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
        const config: AddLoopbackConfiguration = await this.getConfig();
        const { dbComposeServiceName, databaseName, dbType } = await DbUtilities.configureDb(
            config.name,
            DbType.POSTGRES,
            PathUtilities.resolve('.')
        );
        if (dbType !== DbType.POSTGRES) {
            throw new Error('A LoopBack api of Monux uses Postgres as its database');
        }
        const dbKeys: DbKeys = {
            dbHostKey: DefaultEnvKeys.dbHost(dbComposeServiceName),
            dbUserKey: DefaultEnvKeys.dbUser(dbComposeServiceName, databaseName),
            dbPasswordKey: DefaultEnvKeys.dbPassword(dbComposeServiceName, databaseName),
            dbNameKey: DefaultEnvKeys.dbName(dbComposeServiceName, databaseName)
        };

        const root: Path = await this.createProject(config);
        LogUtilities.step('Adding the database, the environment and the image of the workspace');
        await TemplateUtilities.write('loopback', root, { name: config.name, ...dbKeys });
        await NpmUtilities.install(config.name, [NpmPackage.LOOPBACK_CONNECTOR_POSTGRES]);
        await this.setupEnvironment(root, config, dbKeys);
        await this.compileFromWorkspaceRoot(root, config.name);
        await this.addToCompose(root, config);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));

        LogUtilities.step('Setting up eslint');
        await EslintUtilities.setupProjectEslint(root, true, TS_CONFIG_FILE_NAME);
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, ESLINT_CONFIG_FILE_NAME),
            '    ...baseConfig,',
            LOOPBACK_ESLINT_EXCEPTIONS
        );
        await EslintUtilities.fix(root);
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async createProject(config: AddLoopbackConfiguration): Promise<Path> {
        LogUtilities.step('Creating the LoopBack project');
        await LoopbackUtilities.createProject(PathUtilities.resolve(APPS_DIRECTORY_NAME), config.name, {
            '--yes': true,
            '--config': {
                docker: false,
                eslint: false,
                mocha: true,
                loopbackBuild: true,
                prettier: false,
                vscode: false,
                repositories: true,
                services: true
            }
        });
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        // the workspace has one for every project
        await FsUtilities.rm(PathUtilities.resolve(project.path, GIT_IGNORE_FILE_NAME));
        return project.path;
    }

    private async setupEnvironment(root: Path, config: AddLoopbackConfiguration, dbKeys: DbKeys): Promise<void> {
        await EnvUtilities.setupProjectEnvironment(root, true);
        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        const keys: EnvironmentVariableKey[] = [DefaultEnvKeys.ENV, DefaultEnvKeys.port(config.name), ...Object.values(dbKeys)];
        for (const key of keys) {
            await EnvUtilities.addProjectVariableKey(config.name, environmentModel, key, false, PathUtilities.resolve('.'));
        }

        // where the api listens: the port of the workspace during development, behind traefik on every interface of
        // its container
        const indexPath: Path = PathUtilities.resolve(root, 'src', 'index.ts');
        await FsUtilities.replaceInFile(
            indexPath,
            'port: +(process.env.PORT ?? 3000),',
            `port: environment.env === 'dev' ? environment.${DefaultEnvKeys.port(config.name)} : 3000,`
        );
        await FsUtilities.replaceInFile(
            indexPath,
            'host: process.env.HOST || \'127.0.0.1\',',
            'host: environment.env === \'dev\' ? \'127.0.0.1\' : \'0.0.0.0\','
        );
        await FsUtilities.updateFile(indexPath, 'import {environment} from \'./environment/environment\';', 'prepend');
    }

    /**
     * Compiles the api from the root of the workspace, as it imports the global-environment.model.ts there, which a
     * rootDir of src refuses. The output is below dist/apps/<name>/src then, so what LoopBack reads from dist points
     * there.
     * @param root - The directory of the api.
     * @param name - The name of the api.
     */
    private async compileFromWorkspaceRoot(root: Path, name: string): Promise<void> {
        await TsConfigUtilities.updateTsConfig(name, { compilerOptions: { rootDir: '../..' } });
        const output: string = `dist/${APPS_DIRECTORY_NAME}/${name}/src`;
        await NpmUtilities.updatePackageJson(name, {
            main: `${output}/index.js`,
            types: `${output}/index.d.ts`,
            scripts: {
                test: `lb-mocha --allow-console-logs "${output}/__tests__"`,
                'test:dev': `lb-mocha --allow-console-logs ${output}/__tests__/**/*.js`,
                migrate: `node ./${output}/migrate`,
                'openapi-spec': `node ./${output}/openapi-spec`
            }
        });
        // the home page, next to src, four folders up from the compiled application.ts
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'application.ts'),
            'path.join(__dirname, \'../public\')',
            'path.join(__dirname, \'../../../../public\')'
        );
    }

    private async addToCompose(root: Path, config: AddLoopbackConfiguration): Promise<void> {
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