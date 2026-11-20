import { AngularJson, AngularUtilities } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, JsonUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { TsUtilities } from '../../../ts';
import { TsLibraryUtilities } from '../../../ts-library';
import { DeepPartial, OmitStrict } from '../../../types';
import { filterAsync, StringUtilities } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { ZibriUtilities } from '../../../zibri';
import { AddConfiguration, AddType, BaseAddCommand } from '../models';

/**
 * Configuration for adding an Angular app.
 */
type AddAngularConfiguration = AddConfiguration & {
    /**
     * The name of the zibri api the app works with.
     */
    apiName: string,
    /**
     * The port the app is served on during development.
     * @default 4200
     */
    port: number,
    /**
     * The sub domain that this service should be reached under.
     * If nothing is provided, Monux assumes that the service should be reached under the root domain
     * and under the www sub domain.
     */
    subDomain?: string,
    /**
     * The name of the app, as its pages show it in their titles.
     */
    title: string,
    /**
     * The language the app is written in, such as "en" or "de".
     */
    language: string
};

/**
 * What installs the app as a PWA, as far as Monux changes it.
 */
type WebManifest = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    name: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    short_name: string
};

// how much the app downloads before its first page shows, raw. Angular and its router are about 370kB of it, the
// login, the navigation, the offline status bar and the error handling the rest. The build fails beyond, so that a
// heavy dependency added to the first load does not go unnoticed
const INITIAL_BUDGET_WARNING: string = '600kB';
const INITIAL_BUDGET_ERROR: string = '800kB';

// how the env.ts of the api names the pages of an app its mails link to, see templates/zibri
const LINKED_PAGES: string[] = ['/${AppPage.CONFIRM_PASSWORD_RESET}', '/${AppPage.ACCEPT_INVITATION}'];

// the comment in the LogApplication of the contract library of an api the apps are added above, see templates/api-contract
const LOG_APPLICATION_MARKER: string = '// mx add adds the apps above this line';

/**
 * Command that handles adding an Angular app for a zibri api to the monorepo.
 */
export class AddAngularCommand extends BaseAddCommand<AddAngularConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddAngularConfiguration, keyof AddConfiguration>> = {
        apiName: {
            type: 'select',
            name: 'apiName',
            message: 'The zibri api of the app',
            choices: async () => (await this.findApis()).map(api => api.name)
        },
        port: {
            type: 'number',
            name: 'port',
            message: 'Port',
            validate: (v?: number) => !!v,
            default: 4200
        },
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'Sub domain',
            default: 'admin'
        },
        title: {
            type: 'input',
            name: 'title',
            message: 'Name of the app, as its titles show it',
            validate: (v?: string) => AngularUtilities.validateTitle(v),
            default: StringUtilities.toPascalCase(this.baseConfig.name)
        },
        language: {
            type: 'input',
            name: 'language',
            message: 'Language of the app',
            validate: (v?: string) => AngularUtilities.validateLanguage(v),
            default: 'en'
        }
    };

    protected override async run(): Promise<void> {
        if (!(await this.findApis()).length) {
            throw new Error('An app works with a zibri api. Add one with "mx add" first');
        }
        const config: AddAngularConfiguration = await this.getConfig();
        const root: Path = await this.createProject(config);
        const contract: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(
            ZibriUtilities.getContractName(config.apiName),
            PathUtilities.resolve('.')
        );

        LogUtilities.step('Adding the login, the account and what makes the app work offline');
        await this.cleanUp(root);
        await TemplateUtilities.write('angular', root, { name: config.name });
        await TemplateUtilities.write('angular-app', root, {
            title: config.title,
            language: config.language,
            apiPrefix: StringUtilities.toSnakeCase(config.apiName),
            contractPackage: await ZibriUtilities.resolveContractPackage(config.apiName),
            logApplication: this.resolveLogApplication(config.name)
        });
        await this.updateManifest(root, config.title);
        await this.installDependencies(config.name);
        await this.updatePackageJson(config);
        await this.updateAngularJson(root, config.name);
        await EslintUtilities.addLintScripts(root);

        await this.addToCompose(root, config);
        await this.setupEnvironment(root, config);
        await this.connectToApi(config, contract);
        // after its scripts are complete, so that each of them that reads the library builds it first
        await TsLibraryUtilities.install(contract, config.name);

        LogUtilities.step('Setting up eslint');
        await EslintUtilities.fix(root);
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async findApis(): Promise<WorkspaceProject[]> {
        const rootDir: Path = PathUtilities.resolve('.');
        return await filterAsync(
            await WorkspaceUtilities.getProjects('apps', rootDir),
            async p => await WorkspaceUtilities.findProjectType(p.name, rootDir) === AddType.ZIBRI
        );
    }

    private async createProject(config: AddAngularConfiguration): Promise<Path> {
        LogUtilities.step('Creating the Angular project');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            {
                '--skip-git': true,
                '--style': 'tailwind',
                '--ssr': true,
                '--zoneless': true,
                '--ai-config': 'none',
                '--file-name-style-guide': '2016',
                '--defaults': true
            }
        );
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await AngularUtilities.addServiceWorker(project.path);
        return project.path;
    }

    private async cleanUp(root: Path): Promise<void> {
        // what the workspace has once for every project, or what the template replaces
        await Promise.all([
            '.vscode',
            '.editorconfig',
            '.gitignore',
            '.prettierrc',
            'README.md',
            'src/app/app.component.css'
        ].map(f => FsUtilities.rm(PathUtilities.resolve(root, f))));
    }

    private async updateManifest(root: Path, title: string): Promise<void> {
        const manifestPath: Path = PathUtilities.resolve(root, 'public', 'manifest.webmanifest');
        const manifest: WebManifest = await FsUtilities.parseFileAs(manifestPath);
        await FsUtilities.updateFile(
            manifestPath,
            JsonUtilities.stringify({ ...manifest, name: title, short_name: title }),
            'replace'
        );
    }

    private async installDependencies(name: string): Promise<void> {
        LogUtilities.step('Installing the libraries');
        await NpmUtilities.install(name, [
            NpmPackage.SERVICE_SOFT_UI,
            NpmPackage.SERVICE_SOFT_NGX_NAVIGATION,
            NpmPackage.SERVICE_SOFT_NGX_AUTH,
            NpmPackage.SERVICE_SOFT_NGX_PWA,
            NpmPackage.SERVICE_SOFT_NGX_ERROR_HANDLING,
            NpmPackage.SERVICE_SOFT_NGX_PERSISTENCE_LOGGER,
            NpmPackage.SERVICE_SOFT_NGX_ENTITY,
            NpmPackage.ANGULAR_ARIA,
            NpmPackage.ZIBRI_CONTRACT,
            NpmPackage.UQR,
            NpmPackage.FONTAWESOME_SOLID_ICONS
        ]);
        await NpmUtilities.install(name, [NpmPackage.ESLINT_PLUGIN_BETTER_TAILWINDCSS], true);
    }

    private async updatePackageJson(config: AddAngularConfiguration): Promise<void> {
        await NpmUtilities.updatePackageJson(config.name, {
            scripts: {
                start: `ng serve --port ${config.port}`,
                test: 'ng test --watch=false'
            }
        });
    }

    private async updateAngularJson(root: Path, name: string): Promise<void> {
        const update: DeepPartial<AngularJson> = {
            projects: {
                [name]: {
                    architect: {
                        build: {
                            configurations: {
                                production: {
                                    budgets: [
                                        { type: 'initial', maximumWarning: INITIAL_BUDGET_WARNING, maximumError: INITIAL_BUDGET_ERROR },
                                        { type: 'anyComponentStyle', maximumWarning: '2kB', maximumError: '4kB' }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        };
        await AngularUtilities.updateAngularJson(PathUtilities.resolve(root, ANGULAR_JSON_FILE_NAME), update);
    }

    private async addToCompose(root: Path, config: AddAngularConfiguration): Promise<void> {
        const projectDirectory: string = PathUtilities.getRelative(PathUtilities.resolve('.'), root);
        await DockerUtilities.addServiceToCompose(
            {
                name: config.name,
                build: {
                    dockerfile: `./${projectDirectory}/${DOCKER_FILE_NAME}`,
                    context: '.'
                }
            },
            4000,
            config.port,
            true,
            true,
            config.subDomain
        );
        await DockerUtilities.addAllowedHosts(config.name, config.subDomain);
    }

    private async setupEnvironment(root: Path, config: AddAngularConfiguration): Promise<void> {
        await EnvUtilities.setupProjectEnvironment(root, false);
        await EnvUtilities.addProjectVariableKey(
            config.name,
            PathUtilities.resolve(root, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
            DefaultEnvKeys.baseUrl(config.apiName),
            false,
            PathUtilities.resolve('.')
        );
    }

    /**
     * Gets the member of the LogApplication of the contract library an app sends its logs by.
     * @param name - The name of the app.
     * @returns The name of the member, such as "ADMIN".
     */
    private resolveLogApplication(name: string): string {
        return StringUtilities.toSnakeCase(name).toUpperCase();
    }

    /**
     * Makes the api of the app take its logs, its requests from the browser and send its password reset mails to it.
     * @param config - The configuration of the app.
     * @param contract - The contract library of the api.
     */
    private async connectToApi(config: AddAngularConfiguration, contract: WorkspaceProject): Promise<void> {
        LogUtilities.step(`Connecting the app to "${config.apiName}"`);
        const rootDir: Path = PathUtilities.resolve('.');
        const api: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.apiName, rootDir);
        const apiSource: Path = PathUtilities.resolve(api.path, 'src');
        const appBaseUrl: string = `environment.${DefaultEnvKeys.baseUrl(config.name)}`;

        await TsUtilities.addEnumMember(
            PathUtilities.resolve(contract.path, 'src', 'log-application.enum.ts'),
            LOG_APPLICATION_MARKER,
            `${this.resolveLogApplication(config.name)} = '${config.name}'`
        );
        await NpmUtilities.run(contract.name, 'build', false);

        const corsOriginsPath: Path = PathUtilities.resolve(apiSource, 'cors-origins.ts');
        await this.addToArray(corsOriginsPath, 'resolveCorsOrigins', appBaseUrl);
        const environmentImport: string = 'import { environment } from \'./environment/environment\';';
        if (!(await FsUtilities.readFile(corsOriginsPath)).includes(environmentImport)) {
            await FsUtilities.replaceInFile(
                corsOriginsPath,
                'import { CorsOrigin } from \'zibri\';\n',
                `import { CorsOrigin } from 'zibri';\n\n${environmentImport}\n`
            );
        }

        // the first app of an api gets the links of its password reset and invitation mails. Another one keeps the pages
        // of the first
        const envPath: Path = PathUtilities.resolve(apiSource, 'env.ts');
        const apiUrl: string = `\${environment.${DefaultEnvKeys.baseUrl(config.apiName)}}`;
        if ((await FsUtilities.readFile(envPath)).includes(`${apiUrl}${LINKED_PAGES[0]}`)) {
            for (const page of LINKED_PAGES) {
                await FsUtilities.replaceInFile(envPath, `${apiUrl}${page}`, `\${${appBaseUrl}}${page}`);
            }
            await FsUtilities.replaceInFile(
                envPath,
                /\n\s*\/\/ the pages of an app that set a new password[^\n]*\n[^\n]*\n/,
                '\n    // the pages of the app that set a new password and accept an invitation, which the mails link to\n'
            );
        }

        await EnvUtilities.addProjectVariableKey(
            config.apiName,
            PathUtilities.resolve(apiSource, 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
            DefaultEnvKeys.baseUrl(config.name),
            false,
            rootDir
        );
        await EnvUtilities.buildEnvironmentFileForApp(api, false, 'dev.docker-compose.yaml', rootDir);
        await EslintUtilities.fix(api.path);
    }

    /**
     * Adds a value to the end of an array a file of the api passes to a function on one line.
     * @param path - The file.
     * @param functionName - The name of the function the array is passed to.
     * @param value - The value, as typescript.
     */
    private async addToArray(path: Path, functionName: string, value: string): Promise<void> {
        const content: string = await FsUtilities.readFile(path);
        const declaration: RegExp = new RegExp(`(${functionName}\\(\\[)([^\\]]*)\\]`);
        const match: RegExpExecArray | null = declaration.exec(content);
        if (match == undefined) {
            throw new Error(`Could not find the array passed to ${functionName} in ${path}`);
        }
        const values: string = match[2].trim() ? `${match[2].trim()}, ${value}` : value;
        await FsUtilities.updateFile(path, content.replace(declaration, `$1${values}]`), 'replace');
    }
}