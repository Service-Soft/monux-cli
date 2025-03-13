
import { AddLoopbackConfiguration } from '../commands/add/add-loopback';
import { ENVIRONMENT_MODEL_TS_FILE_NAME, TRAEFIK_RESOLVER_ENVIRONMENT_VARIABLE } from '../constants';
import { CPUtilities, FsUtilities } from '../encapsulation';
import { EnvUtilities } from '../env';
import { TsUtilities } from '../ts';
import { generatePlaceholderPassword, getPath, optionsToCliString, toKebabCase, toPascalCase, toSnakeCase } from '../utilities';
import { LbDatabaseConfig } from './lb-database-config.model';
import { NpmPackage, NpmUtilities } from '../npm';
import { adminControllerContent } from './admin-controller.content';
import { fullAdminModelContent } from './full-admin-model.content';
import { newAdminModelContent } from './new-admin-model.content';

/**
 * Generates a database connection for the api.
 */
type CliGenerateDb = `datasource ${string}`;

/**
 * Creates a new project.
 */
type CliNew = `new ${string}`;

/**
 * Generates a service for the api.
 */
type CliService = `service ${string}`;

/**
 * Generates a model for the api.
 */
type CliModel = `model ${string}`;

/**
 * Generates a repository for the api.
 */
type CliRepository = `repository ${string}`;

/**
 * The base configuration shared by all commands.
 */
type BaseConfig = {
    /**
     * Whether or not to skip the npm install step.
     */
    '--skip-install'?: boolean,
    /**
     * Whether or not to select all default values for which no configuration has been provided.
     */
    '--yes'?: boolean
};

/**
 * Configuration options for generating a new loopback application.
 */
type NewConfig = {
    /**
     * Description of the application.
     */
    description?: string,
    /**
     * Project root directory for the application.
     */
    outdir?: string,
    /**
     * Whether or not to add eslint.
     */
    eslint?: boolean,
    /**
     * Whether or not to add prettier.
     */
    prettier?: boolean,
    /**
     * Whether or not to add mocha.
     */
    mocha?: boolean,
    /**
     * Whether or not to include loopbackBuild.
     */
    loopbackBuild?: boolean,
    /**
     * Whether or not to generate vscode config files.
     */
    vscode?: boolean,
    /**
     * Whether or not to generate a docker file.
     */
    docker?: boolean
};

/**
 * Options for the new command of the loopback cli.
 */
type NewOptions = {
    /**
     * A configuration object.
     */
    '--config'?: NewConfig
};

/**
 * Options for the generate datasource command of the loopback cli.
 */
type GenerateDbOptions = BaseConfig & {
    /**
     * A configuration object.
     */
    '--config': LbDatabaseConfig
};

/**
 * Options for generating a service via the loopback cli.
 */
type ServiceOptions = BaseConfig & {
    /**
     * The type of the service to generate.
     */
    '--type'?: 'proxy' | 'class' | 'provider'
};

/**
 * Options for generating a model via the loopback cli.
 */
type ModelOptions = BaseConfig;

/**
 * Options for generating a repository via the loopback cli.
 */
type RepositoryOptions = BaseConfig & {
    /**
     * The name of the model to generate the repository for.
     */
    '--model': string,
    /**
     * The name of the datasource that the repository should access.
     */
    '--datasource': string
};

/**
 * All possible loopback cli commands.
 */
type LoopbackCliCommands = CliGenerateDb | CliNew | CliService | CliModel | CliRepository;

/**
 * Possible angular cli options, narrowed down based on the provided command.
 */
type LoopbackCliOptions<T extends LoopbackCliCommands> =
    T extends CliGenerateDb ? GenerateDbOptions
        : T extends CliNew ? NewOptions
            : T extends CliService ? ServiceOptions
                : T extends CliModel ? ModelOptions
                    : T extends CliRepository ? RepositoryOptions
                        : never;

/**
 * Utilities for loopback.
 */
export abstract class LoopbackUtilities {

    private static readonly CLI_VERSION: number = 6;

    /**
     * Runs an loopback cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static async runCommand(directory: string, command: LoopbackCliCommands, options: LoopbackCliOptions<typeof command>): Promise<void> {
        if (command.startsWith('new ')) {
            // for the new command, extract the name
            command = command.split(' ')[1] as LoopbackCliCommands;
        }
        CPUtilities.execSync(`cd ${directory} && npx @loopback/cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options, ' ')}`);
        if (command.startsWith('service')) {
            const servicePath: string = getPath(directory, 'src', 'services', `${toKebabCase(command.split(' ')[1])}.service.ts`);
            await FsUtilities.replaceInFile(servicePath, '/* inject, */', '');
            await FsUtilities.replaceInFile(servicePath, '/* Add @inject to inject parameters */', '');
            await FsUtilities.replaceInFile(servicePath, '\n  /*\n   * Add service methods here\n   */', '');
        }
    }

    /**
     * Sets up authentication and authorization.
     * @param root - The root of the loopback app.
     * @param config - The configuration options.
     * @param dbName - The name of the database used by the api.
     */
    static async setupAuth(root: string, config: AddLoopbackConfiguration, dbName: string): Promise<void> {
        await NpmUtilities.install(config.name, [
            NpmPackage.LBX_JWT,
            NpmPackage.LOOPBACK_AUTHENTICATION,
            NpmPackage.LOOPBACK_AUTHORIZATION
        ]);
        await NpmUtilities.install(config.name, [NpmPackage.NODEMAILER_TYPES], true);
        await this.applyAuthToApplicationTs(root);
        await this.createMailService(root, config);
        await this.createBiometricCredentialsService(root, config);
        await this.createAdminFiles(root, dbName);

        const emailEnvKey: string = `${toSnakeCase(config.name)}_default_user_email`;
        const passwordEnvKey: string = `${toSnakeCase(config.name)}_default_user_password`;

        await this.applyAuthToIndexTs(root, config, emailEnvKey, passwordEnvKey);

        await this.setupAuthVariables(root, config, emailEnvKey, passwordEnvKey);
    }

    private static async createBiometricCredentialsService(root: string, config: AddLoopbackConfiguration): Promise<void> {
        await this.runCommand(root, 'service BiometricCredentials', { '--skip-install': true, '--type': 'class', '--yes': true });
        const servicePath: string = getPath(root, 'src', 'services', 'biometric-credentials.service.ts');
        await TsUtilities.addImportStatements(
            servicePath,
            [
                { defaultImport: false, element: 'BaseBiometricCredentialsService', path: NpmPackage.LBX_JWT },
                { defaultImport: false, element: 'environment', path: '../environment/environment' }
            ]
        );
        await FsUtilities.replaceInFile(
            servicePath,
            ' class BiometricCredentialsService',
            ' class BiometricCredentialsService extends BaseBiometricCredentialsService'
        );
        await TsUtilities.addToStartOfClass(servicePath, [
            `    protected override readonly RP_NAME: string = '${toPascalCase(config.frontendName)}';`,
            `    protected override readonly RP_DOMAIN: string = environment.${toSnakeCase(config.frontendName)}_domain;`
        ]);
        await FsUtilities.replaceInFile(servicePath, 'constructor() {}', '');
    }

    private static async createAdminFiles(root: string, dbName: string): Promise<void> {
        await this.runCommand(root, 'model Admin', { '--skip-install': true, '--yes': true });
        const adminModelTs: string = getPath(root, 'src', 'models', 'admin.model.ts');
        await FsUtilities.replaceInFile(adminModelTs, 'extends Entity', 'extends ChangeSetEntity');
        await FsUtilities.replaceInFile(adminModelTs, 'Entity, ', '');
        await TsUtilities.addToStartOfClass(adminModelTs, [
            '',
            '    @property({',
            '        type: \'string\',',
            '        required: true',
            '    })',
            '    name!: string;',
            '',
            '    @belongsTo(() => BaseUser)',
            '    baseUserId!: string;'
        ]);
        await TsUtilities.addImportStatements(adminModelTs, [
            { defaultImport: false, element: 'ChangeSetEntity', path: NpmPackage.LBX_CHANGE_SETS },
            // eslint-disable-next-line sonar/no-duplicate-string
            { defaultImport: false, element: 'belongsTo', path: '@loopback/repository' },
            { defaultImport: false, element: 'BaseUser', path: NpmPackage.LBX_JWT }
        ]);

        await this.runCommand(
            root,
            'repository Admin',
            { '--skip-install': true, '--yes': true, '--datasource': dbName, '--model': 'Admin' }
        );
        const adminRepositoryTs: string = getPath(root, 'src', 'repositories', 'admin.repository.ts');
        await TsUtilities.addImportStatements(adminRepositoryTs, [
            { defaultImport: false, element: 'Getter', path: '@loopback/core' },
            { defaultImport: false, element: 'BelongsToAccessor', path: '@loopback/repository' },
            { defaultImport: false, element: 'repository', path: '@loopback/repository' },
            { defaultImport: false, element: 'SecurityBindings', path: '@loopback/security' },
            {
                defaultImport: false,
                element: 'ChangeRepository, ChangeSetRepository, CrudChangeSetRepository',
                path: NpmPackage.LBX_CHANGE_SETS
            },
            { defaultImport: false, element: 'BaseUser, BaseUserProfile, BaseUserRepository', path: NpmPackage.LBX_JWT }
        ]);
        await FsUtilities.replaceInFile(adminRepositoryTs, 'extends DefaultCrudRepository', 'extends CrudChangeSetRepository');
        await FsUtilities.replaceAllInFile(adminRepositoryTs, 'DefaultCrudRepository', '');
        await FsUtilities.replaceInFile(
            adminRepositoryTs,
            '  constructor(',
            '    readonly baseUser: BelongsToAccessor<BaseUser<Roles>, typeof Admin.prototype.id>;\n\n  constructor('
        );
        await TsUtilities.addToConstructorHeader(
            adminRepositoryTs,
            '@repository.getter(\'BaseUserRepository\')\n        baseUserRepositoryGetter: Getter<BaseUserRepository<Roles>>'
        );
        await TsUtilities.addToConstructorHeader(
            adminRepositoryTs,
            '@repository.getter(\'ChangeSetRepository\')\n        changeSetRepositoryGetter: Getter<ChangeSetRepository>'
        );
        await TsUtilities.addToConstructorHeader(
            adminRepositoryTs,
            '@repository(ChangeRepository)\n        changeRepository: ChangeRepository'
        );
        await TsUtilities.addToConstructorHeader(
            adminRepositoryTs,
            '@repository(ChangeSetRepository)\n        changeSetRepository: ChangeSetRepository'
        );
        await TsUtilities.addToConstructorHeader(
            adminRepositoryTs,
            '@inject.getter(SecurityBindings.USER)\n        getUserProfile: Getter<BaseUserProfile<Roles>>'
        );
        await FsUtilities.replaceInFile(
            adminRepositoryTs,
            `'datasources.${dbName}') dataSource`,
            `${toPascalCase(dbName)}DataSource.INJECTION_KEY)\n        dataSource`
        );
        // eslint-disable-next-line stylistic/max-len
        await FsUtilities.replaceInFile(adminRepositoryTs, 'super(Admin, dataSource', 'super(Admin, dataSource, changeSetRepositoryGetter, changeRepository, changeSetRepository, getUserProfile');
        await TsUtilities.addToConstructorBody(adminRepositoryTs, [
            'this.baseUser = this.createBelongsToAccessorFor(\'baseUser\', baseUserRepositoryGetter);',
            'this.registerInclusionResolver(\'baseUser\', this.baseUser.inclusionResolver);'
        ].join('\n'));

        const controllerPath: string = getPath(root, 'src', 'controllers');
        await FsUtilities.createFile(getPath(controllerPath, 'admin', 'admin.controller.ts'), adminControllerContent);
        await FsUtilities.updateFile(getPath(controllerPath, 'index.ts'), 'export * from \'./admin/admin.controller\';', 'append');

        await FsUtilities.createFile(getPath(controllerPath, 'admin', 'new-admin.model.ts'), newAdminModelContent);
        await FsUtilities.createFile(getPath(controllerPath, 'admin', 'full-admin.model.ts'), fullAdminModelContent);
    }

    private static async createMailService(root: string, config: AddLoopbackConfiguration): Promise<void> {
        await this.runCommand(root, 'service mail', { '--skip-install': true, '--type': 'class', '--yes': true });
        const servicePath: string = getPath(root, 'src', 'services', 'mail.service.ts');
        await TsUtilities.addImportStatements(
            servicePath,
            [
                { defaultImport: false, element: 'BaseMailService', path: NpmPackage.LBX_JWT },
                { defaultImport: false, element: 'environment', path: '../environment/environment' },
                { defaultImport: false, element: 'Transporter, createTransport', path: 'nodemailer' },
                { defaultImport: true, element: 'path', path: 'path' }
            ]
        );
        await FsUtilities.replaceInFile(servicePath, ' class MailService', ' class MailService extends BaseMailService<Roles>');
        await TsUtilities.addToStartOfClass(servicePath, [
            '    static readonly BINDING: string = \'services.MailService\';',
            '    protected override readonly WEBSERVER_MAIL: string = environment.webserver_mail_user;',
            // eslint-disable-next-line stylistic/max-len
            `    protected override readonly BASE_RESET_PASSWORD_LINK: string = \`\${environment.${toSnakeCase(config.frontendName)}_base_url}/confirm-reset-password\`;`,
            '    protected override readonly webserverMailTransporter: Transporter = createTransport({',
            '        host: environment.webserver_mail_host,',
            '        port: environment.webserver_mail_port,',
            '        secure: true,',
            '        auth: {',
            '            user: environment.webserver_mail_user,',
            '            pass: environment.webserver_mail_password',
            '        }',
            '    });',
            `    protected override readonly PRODUCTION: boolean = !!environment.${TRAEFIK_RESOLVER_ENVIRONMENT_VARIABLE};`,
            '    protected override readonly SAVED_EMAILS_PATH: string = path.join(__dirname, \'../../../test-emails\');',
            // eslint-disable-next-line stylistic/max-len
            `    protected override readonly LOGO_HEADER_URL: string = \`\${environment.${toSnakeCase(config.name)}_base_url}/assets/email/logo-header.png\`;`,
            // eslint-disable-next-line stylistic/max-len
            `    protected override readonly LOGO_FOOTER_URL: string = \`\${environment.${toSnakeCase(config.name)}_base_url}/assets/email/logo-footer.png\`;`,
            '    protected override readonly ADDRESS_LINES: string[] = [];'
        ]);
        await FsUtilities.replaceInFile(servicePath, 'constructor() {}', '');
    }

    private static async setupAuthVariables(
        root: string,
        config: AddLoopbackConfiguration,
        emailEnvKey: string,
        passwordEnvKey: string
    ): Promise<void> {
        await EnvUtilities.addVariable({ key: emailEnvKey, required: true, type: 'string', value: config.defaultUserEmail });
        await EnvUtilities.addVariable({ key: passwordEnvKey, required: true, type: 'string', value: config.defaultUserPassword });
        await EnvUtilities.addVariable(
            { key: 'access_token_secret', required: true, type: 'string', value: generatePlaceholderPassword() }
        );
        await EnvUtilities.addVariable(
            { key: 'refresh_token_secret', required: true, type: 'string', value: generatePlaceholderPassword() }
        );
        await EnvUtilities.addVariable(
            { key: 'webserver_mail_user', required: true, type: 'string', value: undefined }
        );
        await EnvUtilities.addVariable(
            { key: 'webserver_mail_password', required: true, type: 'string', value: undefined }
        );
        await EnvUtilities.addVariable(
            { key: 'webserver_mail_host', required: true, type: 'string', value: undefined }
        );
        await EnvUtilities.addVariable(
            { key: 'webserver_mail_port', required: true, type: 'number', value: undefined }
        );

        const environmentModel: string = getPath(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, emailEnvKey, true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, passwordEnvKey, true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'access_token_secret', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'refresh_token_secret', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'webserver_mail_user', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'webserver_mail_password', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'webserver_mail_host', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, 'webserver_mail_port', true);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, `${toSnakeCase(config.frontendName)}_base_url`, false);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, `${toSnakeCase(config.name)}_base_url`, false);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, TRAEFIK_RESOLVER_ENVIRONMENT_VARIABLE, false);
        await EnvUtilities.addProjectVariableKey(config.name, environmentModel, `${toSnakeCase(config.frontendName)}_domain`, false);
    }

    private static async applyAuthToIndexTs(
        root: string,
        config: AddLoopbackConfiguration,
        emailEnvKey: string,
        passwordEnvKey: string
    ): Promise<void> {
        const indexTs: string = getPath(root, 'src', 'index.ts');
        await TsUtilities.addImportStatements(
            indexTs,
            [
                { defaultImport: false, element: 'BaseUserRepository, DefaultEntityOmitKeys', path: NpmPackage.LBX_JWT },
                { defaultImport: false, element: 'AdminController', path: './controllers' },
                { defaultImport: false, element: 'NewAdmin', path: './controllers/admin/new-admin.model' },
                { defaultImport: false, element: 'environment', path: './environment/environment' }
            ]
        );
        await FsUtilities.replaceInFile(indexTs, 'return app', 'await createDefaultData(app);\n    return app');
        await FsUtilities.updateFile(indexTs, [
            '',
            `async function createDefaultData(app: ${toPascalCase(config.name)}Application): Promise<void> {`,
            '    const adminController: AdminController = await app.get<AdminController>(\'controllers.AdminController\');',
            // eslint-disable-next-line stylistic/max-len
            '    const baseUserRepository: BaseUserRepository<Roles> = await app.get<BaseUserRepository<Roles>>(\'repositories.BaseUserRepository\');',
            `    if (!await baseUserRepository.findOne({ where: { email: environment.${emailEnvKey} } })) {`,
            // eslint-disable-next-line stylistic/max-len
            '        const newAdmin: Omit<NewAdmin, DefaultEntityOmitKeys | \'changeSets\' | \'id\' | \'baseUserId\' | \'createdAt\' | \'updatedAt\' | \'updatedBy\' | \'createdBy\'> = {',
            '            name: \'Root\',',
            `            password: environment.${passwordEnvKey},`,
            `            email: environment.${emailEnvKey}`,
            '        };',
            '        await adminController.create(newAdmin);',
            '    }',
            '}'
        ], 'append');
    }

    private static async applyAuthToApplicationTs(root: string): Promise<void> {
        // eslint-disable-next-line sonar/no-duplicate-string
        const applicationTs: string = getPath(root, 'src', 'application.ts');
        await TsUtilities.addImportStatements(
            applicationTs,
            [
                {
                    defaultImport: false,
                    // eslint-disable-next-line stylistic/max-len
                    element: 'BaseUserRepository, BiometricCredentialsRepository, CredentialsRepository, LbxJwtAuthController, LbxJwtBindings, LbxJwtComponent, PasswordResetTokenRepository, RefreshTokenRepository',
                    path: NpmPackage.LBX_JWT
                },
                { defaultImport: false, element: 'MailService', path: './services/mail.service' },
                { defaultImport: false, element: 'AuthenticationComponent', path: '@loopback/authentication' },
                { defaultImport: false, element: 'environment', path: './environment/environment' },
                {
                    defaultImport: false,
                    element: 'AuthorizationBindings, AuthorizationComponent, AuthorizationDecision, AuthorizationOptions',
                    path: '@loopback/authorization'
                },
                { defaultImport: false, element: 'BiometricCredentialsService', path: './services/biometric-credentials.service' }
            ]
        );

        await TsUtilities.addToEndOfClass(applicationTs, [
            '',
            '    private setupAuthentication(): void {',
            '        this.component(AuthenticationComponent);',
            '        this.component(LbxJwtComponent);',
            '',
            '        this.bind(LbxJwtBindings.ACCESS_TOKEN_SECRET).to(environment.access_token_secret);',
            '        this.bind(LbxJwtBindings.REFRESH_TOKEN_SECRET).to(environment.refresh_token_secret);',
            '        this.bind(LbxJwtBindings.MAIL_SERVICE).toClass(MailService);',
            '        this.bind(LbxJwtBindings.BIOMETRIC_CREDENTIALS_SERVICE).toClass(BiometricCredentialsService);',
            '',
            '        this.repository(BaseUserRepository);',
            '        this.repository(CredentialsRepository);',
            '        this.repository(BiometricCredentialsRepository);',
            '        this.repository(RefreshTokenRepository);',
            '        this.repository(PasswordResetTokenRepository);',
            '',
            '        this.controller(LbxJwtAuthController);',
            '    }'
        ]);
        await TsUtilities.addToConstructorBody(applicationTs, 'this.setupAuthentication();');

        await TsUtilities.addToEndOfClass(applicationTs, [
            '',
            '    private setupAuthorization(): void {',
            '        const authOptions: AuthorizationOptions = {',
            '            precedence: AuthorizationDecision.DENY,',
            '            defaultDecision: AuthorizationDecision.DENY',
            '        };',
            '        this.configure(AuthorizationBindings.COMPONENT).to(authOptions);',
            '        this.component(AuthorizationComponent);',
            '    }'
        ]);
        await TsUtilities.addToConstructorBody(applicationTs, 'this.setupAuthorization();');
    }

    /**
     * Sets up logging.
     * @param root - The root folder of the loopback app.
     * @param name - The name of the loopback app.
     */
    static async setupLogging(root: string, name: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.LBX_PERSISTENCE_LOGGER, NpmPackage.LOOPBACK_CRON]);

        const applicationTs: string = getPath(root, 'src', 'application.ts');
        await TsUtilities.addImportStatements(
            applicationTs,
            [
                {
                    defaultImport: false,
                    element: 'LbxLogErrorProvider, LbxPersistenceLoggerComponent, LbxPersistenceLoggerComponentBindings, LogRepository',
                    path: NpmPackage.LBX_PERSISTENCE_LOGGER
                },
                {
                    defaultImport: false,
                    element: 'RestBindings',
                    path: '@loopback/rest'
                }
            ]
        );
        await TsUtilities.addToEndOfClass(applicationTs, [
            '',
            '    private setupLogging(): void {',
            '        this.component(LbxPersistenceLoggerComponent);',
            '        this.repository(LogRepository);',
            '        this.bind(LbxPersistenceLoggerComponentBindings.LOGGER_NOTIFICATION_SERVICE).toClass(MailService);',
            '        this.bind(RestBindings.SequenceActions.LOG_ERROR).toProvider(LbxLogErrorProvider);',
            '    }'
        ]);
        await TsUtilities.addToConstructorBody(applicationTs, 'this.setupLogging();');
        const indexTs: string = getPath(root, 'src', 'index.ts');
        await TsUtilities.addImportStatements(
            indexTs,
            [
                {
                    defaultImport: false,
                    element: 'LbxPersistenceLoggerComponentBindings, LoggerService',
                    path: NpmPackage.LBX_PERSISTENCE_LOGGER
                }
            ]
        );
        await TsUtilities.addBelowImports(indexTs, ['export let logger: LoggerService;']);
        await FsUtilities.replaceInFile(
            indexTs,
            'await app.start();',
            'await app.start();\n    logger = await app.get(LbxPersistenceLoggerComponentBindings.LOGGER_SERVICE);'
        );
        await FsUtilities.replaceInFile(indexTs, 'console.log(`Server', 'await logger.info(`Server');

        const mailServiceTs: string = getPath(root, 'src', 'services', 'mail.service.ts');
        await TsUtilities.addImportStatements(
            mailServiceTs,
            [{ defaultImport: false, element: 'Log, LoggerNotificationService', path: NpmPackage.LBX_PERSISTENCE_LOGGER }]
        );
        await FsUtilities.replaceInFile(
            mailServiceTs,
            'extends BaseMailService<Roles> {',
            'extends BaseMailService<Roles> implements LoggerNotificationService {'
        );
        await FsUtilities.replaceInFile(
            mailServiceTs,
            'ADDRESS_LINES: string[] = [];',
            'ADDRESS_LINES: string[] = [];\n\n    async notify(log: Log): Promise<void> {\n        // TODO\n    }'
        );
    }

    /**
     * Sets up change sets.
     * @param root - THe root of the loopback app.
     * @param name - The name of the loopback app.
     */
    static async setupChangeSets(root: string, name: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.LBX_CHANGE_SETS]);
        const applicationTs: string = getPath(root, 'src', 'application.ts');
        await TsUtilities.addImportStatements(
            applicationTs,
            [
                {
                    defaultImport: false,
                    element: 'ChangeRepository, ChangeSetRepository, LbxChangeSetsComponent',
                    path: NpmPackage.LBX_CHANGE_SETS
                }
            ]
        );
        await TsUtilities.addToEndOfClass(applicationTs, [
            '',
            '    private setupChangeSets(): void {',
            '        this.component(LbxChangeSetsComponent);',
            '        this.repository(ChangeRepository);',
            '        this.repository(ChangeSetRepository);',
            '    }'
        ]);
        await TsUtilities.addToConstructorBody(applicationTs, 'this.setupChangeSets();');
    }
}