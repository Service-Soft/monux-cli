import { APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, PACKAGE_JSON_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType, DbUtilities } from '../../../db';
import { DockerUtilities } from '../../../docker';
import { CryptoUtilities, FsUtilities, JsonUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities, EnvVariable } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities, PackageJson } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { TsLibraryUtilities } from '../../../ts-library';
import { OmitStrict } from '../../../types';
import { StringUtilities } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { ZIBRI_FEATURES_NEEDING_PAGES, ZibriFeature, ZibriUtilities } from '../../../zibri';
import { AddConfiguration, AddType, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new zibri api.
 */
type AddZibriConfiguration = AddConfiguration & {
    /**
     * The port the api listens on during development.
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
     * The optional parts of zibri the api gets.
     */
    features: ZibriFeature[],
    /**
     * The email of the administrator zibri creates when it starts.
     */
    defaultUserEmail: string,
    /**
     * The password of the administrator zibri creates when it starts.
     */
    defaultUserPassword: string
};

/**
 * A feature as the checkbox of the features hands it to its validation.
 */
type FeatureChoice = {
    /**
     * The feature.
     */
    value: ZibriFeature
};

// where zibri defines what it injects, which Monux adds to
const PROVIDERS_FILE_NAME: string = 'providers.ts';

// the controllers of templates/zibri, which the admin app calls
const MONUX_CONTROLLERS: string[] = ['UserController', 'TenantController', 'InvitationController', 'RoleController', 'LogController'];

// what zibri's code and its dependencies are called, which the spellchecker of the workspace does not know
const ZIBRI_WORDS: string[] = ['chartjs', 'deactivatable', 'eventloop', 'jose', 'opentelemetry', 'pooler', 'prometheus'];

// zibri refuses a shorter password, see the PASSWORD_POLICY in its providers.ts. The api reads it from the
// PASSWORD_MIN_LENGTH of its contract library, which templates/api-contract starts with the same value
const MIN_PASSWORD_LENGTH: number = 15;

// the global variables of the workspace every zibri api reads. Shared, as a workspace usually sends its mails through one server
const MAIL_VARIABLES: EnvVariable[] = [
    { key: DefaultEnvKeys.WEBSERVER_MAIL_HOST, required: false, type: 'string', value: undefined },
    { key: DefaultEnvKeys.WEBSERVER_MAIL_PORT, required: false, type: 'number', value: undefined },
    { key: DefaultEnvKeys.WEBSERVER_MAIL_USER, required: false, type: 'string', value: undefined },
    { key: DefaultEnvKeys.WEBSERVER_MAIL_PASSWORD, required: false, type: 'string', value: undefined }
];

/**
 * Command that handles adding a zibri api to the monorepo.
 */
export class AddZibriCommand extends BaseAddCommand<AddZibriConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddZibriConfiguration, keyof AddConfiguration>> = {
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
        },
        features: {
            type: 'checkbox',
            name: 'features',
            message: 'Features of zibri',
            choices: [
                { name: 'Pages rendered by the api', value: 'pages', checked: true },
                { name: 'Documentation pages', value: 'docs' },
                { name: 'Mailing list', value: 'mailingList' },
                { name: 'Metrics dashboard', value: 'metricsDashboard', checked: true },
                { name: 'Errors sent by email', value: 'logEmail', checked: true }
            ],
            validate: (features: readonly FeatureChoice[]) => features.some(f => f.value === 'pages')
                || !features.some(f => ZIBRI_FEATURES_NEEDING_PAGES.includes(f.value))
                ? true
                : 'Documentation pages, the mailing list and the metrics dashboard need the pages rendered by the api'
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
            type: 'password',
            name: 'defaultUserPassword',
            message: 'Password of the default user',
            validate: (v?: string) => v != undefined && v.length >= MIN_PASSWORD_LENGTH
                ? true
                : `The password needs to be at least ${MIN_PASSWORD_LENGTH} characters long`
        }
    };

    protected override async run(): Promise<void> {
        const config: AddZibriConfiguration = await this.getConfig();
        const { dbComposeServiceName, databaseName } = await DbUtilities.configureDb(
            config.name,
            DbType.POSTGRES,
            PathUtilities.resolve('.')
        );
        const root: Path = await this.createProject(config);
        const contract: WorkspaceProject = await this.createContract(config.name);

        LogUtilities.step('Adding what the admin app needs and the workspace reads');
        await this.writeTemplate(root, config.name, dbComposeServiceName, databaseName, contract);
        await this.registerControllers(root);
        await this.addInvitationsAndTenantDeletion(root);
        await this.logMailsOnDevelopmentMachines(root);
        await this.useContract(root, contract);
        await TsLibraryUtilities.install(contract, config.name);

        await this.addToCompose(root, config);
        await this.addVariables(config);
        await this.setupEnvironment(root, config.name, dbComposeServiceName, databaseName);

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));

        await this.setupEslint(root);
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async setupEslint(root: Path): Promise<void> {
        LogUtilities.step('Setting up eslint');
        // zibri's own code documents with comments rather than JSDoc on every function
        await EslintUtilities.setupProjectEslint(root, true, 'tsconfig.json');
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, ESLINT_CONFIG_FILE_NAME),
            '    ...baseConfig,',
            [
                '    ...baseConfig,',
                '    { ignores: [\'assets\', \'dist\', \'versions\'] },',
                // the same exceptions zibri's own repository makes
                '    {',
                '        files: [\'**/*.ts\', \'**/*.tsx\'],',
                '        rules: {',
                '            // "__testing__" is where zibri keeps what its tests share',
                '            \'unicorn/filename-case\': [\'warn\', { directoryRoots: [/(^|\\/)__testing__$/u] }],',
                '            // null is how a write clears a value in zibri',
                '            \'unicorn/no-null\': \'off\'',
                '        }',
                '    },',
                '    {',
                '        // npm writes the package.json, with every array spread over lines',
                '        files: [\'**/package.json\'],',
                '        rules: {',
                '            \'json/array-bracket-newline\': \'off\'',
                '        }',
                '    },'
            ].join('\n')
        );
        await EslintUtilities.addWords(ZIBRI_WORDS);
        await EslintUtilities.fix(root);
    }

    private async createProject(config: AddZibriConfiguration): Promise<Path> {
        LogUtilities.step('Creating the zibri project');
        await ZibriUtilities.createProject(PathUtilities.resolve(APPS_DIRECTORY_NAME), config.name, config.features);
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await this.moveAllowScriptsToRoot(newProject.path);
        return newProject.path;
    }

    /**
     * Moves the install scripts zibri decided on to the root of the workspace, the only package.json npm reads them
     * from there. In the one of the api, npm ignores them and warns about them and about the scripts they decide on.
     * @param root - The directory of the api.
     */
    private async moveAllowScriptsToRoot(root: Path): Promise<void> {
        const packageJsonPath: Path = PathUtilities.resolve(root, PACKAGE_JSON_FILE_NAME);
        const { allowScripts, ...packageJson } = await FsUtilities.parseFileAs<PackageJson>(packageJsonPath);
        if (allowScripts == undefined) {
            return;
        }
        await NpmUtilities.updateRootPackageJson({ allowScripts });
        await FsUtilities.updateFile(packageJsonPath, JsonUtilities.stringify(packageJson), 'replace');
    }

    /**
     * Creates the library of what the api and its apps agree on, like the names of its permissions and the models it
     * answers with, which the template of the api imports.
     * @param name - The name of the api.
     * @returns The library.
     */
    private async createContract(name: string): Promise<WorkspaceProject> {
        const contractName: string = ZibriUtilities.getContractName(name);
        const rootDir: Path = PathUtilities.resolve('.');
        await WorkspaceUtilities.addProjectConfig(contractName, AddType.TS_LIBRARY, rootDir);
        const contract: WorkspaceProject = await TsLibraryUtilities.create(contractName, await ZibriUtilities.resolveContractPackage(name));
        await TemplateUtilities.write('api-contract', contract.path, { apiName: name });
        await NpmUtilities.install(contractName, [NpmPackage.ZIBRI_CONTRACT]);
        await EslintUtilities.fix(contract.path);
        await NpmUtilities.run(contractName, 'build', false);
        return contract;
    }

    /**
     * Points what zibri generated at the contract library, where it names what the apps of the api read as well.
     * @param root - The directory of the api.
     * @param contract - The contract library.
     */
    private async useContract(root: Path, contract: WorkspaceProject): Promise<void> {
        const contractPackage: string = await NpmUtilities.resolvePackageName(contract);
        const authControllerPath: Path = PathUtilities.resolve(root, 'src', 'controllers', 'auth.controller.ts');
        await FsUtilities.replaceInFile(authControllerPath, '@Controller(\'/auth\'', '@Controller(`/${ApiRoute.AUTH}`');
        await FsUtilities.updateFile(authControllerPath, `import { ApiRoute } from '${contractPackage}';`, 'prepend');
        const providersPath: Path = PathUtilities.resolve(root, 'src', PROVIDERS_FILE_NAME);
        await FsUtilities.replaceInFile(providersPath, `minLength: ${MIN_PASSWORD_LENGTH},`, 'minLength: PASSWORD_MIN_LENGTH,');
        await FsUtilities.updateFile(providersPath, `import { PASSWORD_MIN_LENGTH } from '${contractPackage}';`, 'prepend');
    }

    private async writeTemplate(
        root: Path,
        name: string,
        dbServiceName: string,
        databaseName: string,
        contract: WorkspaceProject
    ): Promise<void> {
        // the values come from the environment of the workspace instead, see env.ts. The Docker image is built from the
        // root of the workspace, with its own Dockerfile.dockerignore
        await Promise.all([
            FsUtilities.rm(PathUtilities.resolve(root, '.env')),
            FsUtilities.rm(PathUtilities.resolve(root, '.env.example')),
            FsUtilities.rm(PathUtilities.resolve(root, '.dockerignore'))
        ]);
        await TemplateUtilities.write('zibri', PathUtilities.resolve(root), {
            name,
            prefix: StringUtilities.toSnakeCase(name),
            dbHostKey: DefaultEnvKeys.dbHost(dbServiceName),
            dbUserKey: DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            dbPasswordKey: DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            dbNameKey: DefaultEnvKeys.dbName(dbServiceName, databaseName),
            contractPackage: await NpmUtilities.resolvePackageName(contract)
        });
    }

    private async registerControllers(root: Path): Promise<void> {
        const source: Path = PathUtilities.resolve(root, 'src');
        await FsUtilities.updateFile(
            PathUtilities.resolve(source, 'controllers', 'index.ts'),
            [
                'export * from \'./invitation.controller\';',
                'export * from \'./log.controller\';',
                'export * from \'./role.controller\';',
                'export * from \'./tenant.controller\';',
                'export * from \'./user.controller\';'
            ],
            'append'
        );
        const applicationOptionsPath: Path = PathUtilities.resolve(source, 'application-options.base.ts');
        // after the ones zibri generated, one per line, as they outgrow the line. The names of the import are sorted
        const controllersList: RegExp = /controllers: \[([^\]]*)\],/;
        const generated: string[] = controllersList.exec(await FsUtilities.readFile(applicationOptionsPath))?.[1].split(', ') ?? [];
        const controllers: string[] = [...generated, ...MONUX_CONTROLLERS];
        await FsUtilities.replaceInFile(
            applicationOptionsPath,
            controllersList,
            `controllers: [\n        ${controllers.join(',\n        ')}\n    ],`
        );
        const names: string[] = controllers.toSorted((a, b) => a.localeCompare(b));
        await FsUtilities.replaceInFile(
            applicationOptionsPath,
            /import \{ [^}]* \} from '\.\/controllers';/,
            `import {\n    ${names.join(',\n    ')}\n} from './controllers';`
        );
        // the apps of the workspace that call the api from a browser, see cors-origins.ts
        await FsUtilities.replaceInFile(
            applicationOptionsPath,
            'import { requireOneOfEnv, requireUrlEnv } from \'./env\';',
            'import { CORS_ORIGINS } from \'./cors-origins\';\nimport { requireOneOfEnv, requireUrlEnv } from \'./env\';'
        );
        await FsUtilities.replaceInFile(
            applicationOptionsPath,
            '    providers\n};',
            '    security: {\n        cors: { origins: CORS_ORIGINS.length ? CORS_ORIGINS : \'*\' }\n    },\n    providers\n};'
        );
    }

    /**
     * Lets the admin app invite people: the invitation entity and its repository in the data source, the options zibri
     * sends the mails with, and the routes of the AuthController that answer a link. Adds the deletion of tenants to the
     * data source as well, which the admin app deletes tenants with.
     * @param root - The directory of the api.
     */
    private async addInvitationsAndTenantDeletion(root: Path): Promise<void> {
        const source: Path = PathUtilities.resolve(root, 'src');
        await FsUtilities.updateFile(
            PathUtilities.resolve(source, 'models', 'index.ts'),
            'export * from \'./invitation.model\';',
            'append'
        );
        await FsUtilities.updateFile(
            PathUtilities.resolve(source, 'repositories', 'index.ts'),
            'export * from \'./invitation.repository\';',
            'append'
        );

        const entitiesPath: Path = PathUtilities.resolve(source, 'data-sources', 'db', 'entities.ts');
        await FsUtilities.replaceInFile(entitiesPath, ' SigningKey, ThreadJobEntity,', ' SigningKey, TenantDeletion, ThreadJobEntity,');
        await FsUtilities.replaceInFile(entitiesPath, 'import { Membership,', 'import { Invitation, Membership,');
        await FsUtilities.replaceInFile(entitiesPath, '    Tenant,\n', '    Tenant,\n    TenantDeletion,\n    Invitation,\n');
        const repositoriesPath: Path = PathUtilities.resolve(source, 'data-sources', 'db', 'repositories.ts');
        await FsUtilities.replaceInFile(
            repositoriesPath,
            'import { MembershipRepository,',
            'import { InvitationRepository, MembershipRepository,'
        );
        await FsUtilities.replaceInFile(repositoriesPath, '    RoleRepository\n];', '    RoleRepository,\n    InvitationRepository\n];');

        const authControllerPath: Path = PathUtilities.resolve(source, 'controllers', 'auth.controller.ts');
        await FsUtilities.replaceInFile(
            authControllerPath,
            '    twoFactorRegistrationsRoute: true\n',
            [
                '    twoFactorRegistrationsRoute: true,',
                '    // the routes that answer the link of an invitation, see the InvitationController',
                '    invitationRoutes: true',
                ''
            ].join('\n')
        );

        const providersPath: Path = PathUtilities.resolve(source, PROVIDERS_FILE_NAME);
        await FsUtilities.replaceInFile(
            providersPath,
            'GlobalRegistry, JwtAuthOptionsInput',
            'GlobalRegistry, InvitationOptions, JwtAuthOptionsInput'
        );
        await FsUtilities.replaceInFile(
            providersPath,
            'import { PasswordResetEmail } from',
            'import { InvitationEmail } from \'./templates/emails/invitation\';\nimport { PasswordResetEmail } from'
        );
        await FsUtilities.replaceInFile(
            providersPath,
            '    defineProvider({\n        token: ZIBRI_DI_TOKENS.CONFIRM_PASSWORD_RESET_URL,',
            [
                '    defineProvider({',
                '        // the invitations of the admin app, see the invitations docs. A link opens the page of the app that',
                '        // accepts it, see env.ts, and works for a week. Following one later mails a new one',
                '        token: ZIBRI_DI_TOKENS.INVITATION_OPTIONS,',
                '        useFactory: (): InvitationOptions => ({',
                '            acceptInvitationUrl: requireUrlEnv(\'ACCEPT_INVITATION_URL\'),',
                '            invitationEmail: InvitationEmail,',
                '            tokenExpiresInMs: Ms.DAY * 7,',
                '            onExpiredToken: \'renew\'',
                '        })',
                '    }),',
                '    defineProvider({',
                '        token: ZIBRI_DI_TOKENS.CONFIRM_PASSWORD_RESET_URL,'
            ].join('\n')
        );
    }

    /**
     * Lets the api log its mails instead of sending them wherever it is not deployed, see SENDS_MAILS in its env.ts.
     * Zibri decides by its own environment, which is production in the images of the local compose file as well.
     * @param root - The directory of the api.
     */
    private async logMailsOnDevelopmentMachines(root: Path): Promise<void> {
        const providersPath: Path = PathUtilities.resolve(root, 'src', PROVIDERS_FILE_NAME);
        await FsUtilities.replaceInFile(
            providersPath,
            [
                '        // in development every mail is logged instead of sent, see the email docs',
                '        useFactory: () => GlobalRegistry.getAppData(\'environment\') === \'development\''
            ].join('\n'),
            [
                '        // only where the api is deployed. Everywhere else every mail is logged instead, see SENDS_MAILS in env.ts',
                '        useFactory: () => !SENDS_MAILS'
            ].join('\n')
        );
        await FsUtilities.replaceInFile(providersPath, 'GlobalRegistry, InvitationOptions,', 'InvitationOptions,');
        await FsUtilities.replaceInFile(
            providersPath,
            'import { optionalEnv, requireEnv, requirePortEnv, requireUrlEnv } from \'./env\';',
            'import { optionalEnv, requireEnv, requirePortEnv, requireUrlEnv, SENDS_MAILS } from \'./env\';'
        );
    }

    private async addToCompose(root: Path, config: AddZibriConfiguration): Promise<void> {
        // what zibri writes while it runs, like uploads and backups, outlives the container
        const volume: string = `${StringUtilities.toKebabCase(config.name)}-zibri`;
        // compose resolves paths against the root of the workspace
        const projectDirectory: string = PathUtilities.getRelative(PathUtilities.resolve('.'), root);
        await DockerUtilities.addServiceToCompose(
            {
                name: config.name,
                build: {
                    dockerfile: `./${projectDirectory}/${DOCKER_FILE_NAME}`,
                    context: '.'
                },
                volumes: [`${volume}:/workspace/${projectDirectory}/.zibri`],
                envFile: [`./${projectDirectory}/.env`]
            },
            3000,
            config.port,
            true,
            false,
            config.subDomain
        );
        await DockerUtilities.addVolumeToComposeFiles(volume);
    }

    private async addVariables(config: AddZibriConfiguration): Promise<void> {
        const secrets: EnvVariable[] = [
            {
                key: DefaultEnvKeys.jwtAccessSecret(config.name),
                required: true,
                type: 'string',
                value: CryptoUtilities.generatePassword(64)
            },
            {
                key: DefaultEnvKeys.jwtRefreshSecret(config.name),
                required: true,
                type: 'string',
                value: CryptoUtilities.generatePassword(64)
            },
            // zibri encrypts with AES-GCM, whose key is 32 bytes, written as base64url
            { key: DefaultEnvKeys.masterKey(config.name), required: true, type: 'string', value: CryptoUtilities.generateKey(32) },
            { key: DefaultEnvKeys.defaultUserEmail(config.name), required: true, type: 'string', value: config.defaultUserEmail },
            { key: DefaultEnvKeys.defaultUserPassword(config.name), required: true, type: 'string', value: config.defaultUserPassword }
        ];
        for (const variable of secrets) {
            await EnvUtilities.addStaticVariable(variable, false);
        }
        for (const variable of MAIL_VARIABLES) {
            if (!await EnvUtilities.hasStaticVariable(variable.key)) {
                await EnvUtilities.addStaticVariable(variable, false);
            }
        }
    }

    private async setupEnvironment(root: Path, name: string, dbServiceName: string, databaseName: string): Promise<void> {
        await EnvUtilities.setupProjectEnvironment(root, false);
        const keys: EnvironmentVariableKey[] = [
            DefaultEnvKeys.ENV,
            DefaultEnvKeys.port(name),
            DefaultEnvKeys.baseUrl(name),
            DefaultEnvKeys.dbHost(dbServiceName),
            DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            DefaultEnvKeys.dbName(dbServiceName, databaseName),
            DefaultEnvKeys.jwtAccessSecret(name),
            DefaultEnvKeys.jwtRefreshSecret(name),
            DefaultEnvKeys.masterKey(name),
            DefaultEnvKeys.defaultUserEmail(name),
            DefaultEnvKeys.defaultUserPassword(name),
            ...MAIL_VARIABLES.map(v => v.key)
        ];
        const environmentModel: Path = PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        for (const key of keys) {
            await EnvUtilities.addProjectVariableKey(name, environmentModel, key, false, PathUtilities.resolve('.'));
        }
    }
}