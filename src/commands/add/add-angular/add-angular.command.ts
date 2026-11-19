import { ModuleResolutionKind } from 'typescript';

import { AngularUtilities, NavElementTypes } from '../../../angular';
import { ANGULAR_APP_COMPONENT_FILE_NAME, ANGULAR_JSON_FILE_NAME, APP_CONFIG_FILE_NAME, APPS_DIRECTORY_NAME, BASE_TS_CONFIG_FILE_NAME, DOCKER_FILE_NAME, GIT_IGNORE_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, JsonUtilities, LogUtilities, QuestionsFor, PathUtilities, Path } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { StringUtilities } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand, AddConfiguration } from '../models';

/**
 * Configuration for adding a new angular app.
 */
type AddAngularConfiguration = AddConfiguration & {
    /**
     * Name of the api used by this app.
     */
    apiName: string,
    /**
     * The port that should be used by the application.
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
     * Suffix for the html title (eg. "| My Company").
     */
    titleSuffix: string
};

/**
 * Command that handles adding an angular application to the monorepo.
 */
export class AddAngularCommand extends BaseAddCommand<AddAngularConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddAngularConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            name: 'port',
            message: 'port',
            validate: (v?: number) => !!v,
            default: 4200
        },
        subDomain: {
            type: 'input',
            name: 'subDomain',
            message: 'sub domain'
        },
        titleSuffix: {
            type: 'input',
            name: 'titleSuffix',
            message: 'title suffix (eg. "| My Company")',
            validate: (v?: string) => !!v,
            default: `| ${StringUtilities.toPascalCase(this.baseConfig.name)}`
        },
        apiName: {
            type: 'input',
            name: 'apiName',
            message: 'name of the api to use',
            validate: (v?: string) => !!v,
            default: 'api'
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularConfiguration = await this.getConfig();
        const root: Path = await this.createProject(config);
        await Promise.all([
            this.cleanUp(root, config.name),
            this.setupTsConfig(root, config.name),
            this.createDockerfile(root, config),
            EslintUtilities.setupProjectEslint(root, true),
            this.setupTailwind(root),
            EnvUtilities.setupProjectEnvironment(root, false),
            DockerUtilities.addServiceToCompose(
                {
                    name: config.name,
                    build: {
                        dockerfile: `./${root}/${DOCKER_FILE_NAME}`,
                        context: '.'
                    },
                    volumes: [`/${config.name}`]
                },
                4000,
                config.port,
                true,
                true,
                config.subDomain
            ),
            AngularUtilities.updateAngularJson(
                PathUtilities.resolve(root, ANGULAR_JSON_FILE_NAME),
                {
                    $schema: '../../node_modules/@angular/cli/lib/config/schema.json',
                    projects: {
                        [config.name]: {
                            architect: {
                                build: {
                                    configurations: {
                                        production: {
                                            budgets: [
                                                {
                                                    maximumError: '3MB',
                                                    maximumWarning: '500kB',
                                                    type: 'initial'
                                                },
                                                {
                                                    maximumError: '4kB',
                                                    maximumWarning: '2kB',
                                                    type: 'anyComponentStyle'
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ),
            AngularUtilities.setupMaterial(root)
        ]);

        const prodRootDomain: string = await EnvUtilities.getEnvVariable(
            DefaultEnvKeys.PROD_ROOT_DOMAIN,
            'dev.docker-compose.yaml',
            PathUtilities.resolve('.')
        );
        const fullDomain: string = config.subDomain ? `${config.subDomain}.${prodRootDomain}` : prodRootDomain;

        await AngularUtilities.setupNavigation(root, config.name);
        await AngularUtilities.setupLogging(root, config.name, config.apiName);
        await AngularUtilities.setupAuth(root, config.name, config.apiName, fullDomain, config.titleSuffix);
        await AngularUtilities.setupChangeSets(root, config.name, config.apiName);
        await AngularUtilities.setupPwa(root, config.name);
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'app', APP_CONFIG_FILE_NAME),
            '\'ALLOWED_DOMAINS_PLACEHOLDER\'',
            `environment.${DefaultEnvKeys.domain(config.apiName)}`
        );
        await NpmUtilities.install(config.name, [NpmPackage.NGX_MATERIAL_ENTITY]);

        await this.createDefaultPages(root, config);

        await NpmUtilities.updatePackageJson(config.name, { scripts: { start: `ng serve --port ${config.port}` }, prettier: undefined });

        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, false, 'dev.docker-compose.yaml', PathUtilities.resolve('.'));
    }

    private async setupTailwind(root: string): Promise<void> {
        await TailwindUtilities.setupProjectTailwind(root);
        await FsUtilities.updateFile(PathUtilities.resolve(root, 'src', 'styles.css'), [
            '@tailwind base;',
            '@tailwind components;',
            '@tailwind utilities;'
        ], 'append');
    }

    private async createDefaultPages(root: Path, config: AddAngularConfiguration): Promise<void> {
        await AngularUtilities.generatePage(
            root,
            'Home',
            {
                addTo: 'navbar',
                rowIndex: 0,
                element: {
                    type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,
                    title: 'Home',
                    link: {
                        route: {
                            path: '',
                            title: `Home ${config.titleSuffix}`,
                            // @ts-ignore
                            // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                            loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
                            canActivate: ['JwtLoggedInGuard']
                        }
                    },
                    position: 'center',
                    // @ts-ignore
                    condition: 'isLoggedIn'
                }
            },
            undefined
        );
    }

    private async createDockerfile(root: string, config: AddAngularConfiguration): Promise<void> {
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
                `COPY --from=build /home/node/root/${APPS_DIRECTORY_NAME}/${config.name}/dist/${config.name} ./`,
                'CMD node server/server.mjs'
            ]
        );
    }

    private async createProject(config: AddAngularConfiguration): Promise<Path> {
        LogUtilities.step('Creating the project');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            { '--skip-git': true, '--style': 'css', '--inline-style': true, '--ssr': true, '--ai-config': 'none', '--zoneless': false }
        );
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));
        await AngularUtilities.updateAngularJson(
            PathUtilities.resolve(newProject.path, ANGULAR_JSON_FILE_NAME),
            {
                projects: {
                    [newProject.name]: {
                        schematics: {
                            '@schematics/angular:component': {
                                style: 'css',
                                type: 'component'
                            },
                            '@schematics/angular:service': {
                                type: 'service'
                            },
                            '@schematics/angular:pipe': {
                                typeSeparator: '.'
                            },
                            '@schematics/angular:guard': {
                                typeSeparator: '.'
                            }
                        }
                    }
                }
            }
        );
        await FsUtilities.updateFile(PathUtilities.resolve(newProject.path, 'src', 'app', 'app.html'), '', 'replace');
        await AngularUtilities.addProvider(newProject.path, 'provideHttpClient(withInterceptorsFromDi(), withFetch())', [
            // eslint-disable-next-line sonar/no-duplicate-string
            { defaultImport: false, element: 'provideHttpClient', path: '@angular/common/http' },
            { defaultImport: false, element: 'withInterceptorsFromDi', path: '@angular/common/http' },
            { defaultImport: false, element: 'withFetch', path: '@angular/common/http' }
        ]);
        return newProject.path;
    }

    private async cleanUp(root: string, name: string): Promise<void> {
        LogUtilities.step('Cleaning up');
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'app', ANGULAR_APP_COMPONENT_FILE_NAME),
            `protected readonly title = signal('${name}');`,
            '  constructor() {}'
        );
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(root, 'src', 'app', ANGULAR_APP_COMPONENT_FILE_NAME),
            'Component, signal',
            'Component'
        );
        await FsUtilities.rm(PathUtilities.resolve(root, '.vscode'));
        await FsUtilities.rm(PathUtilities.resolve(root, '.editorconfig'));
        await FsUtilities.rm(PathUtilities.resolve(root, GIT_IGNORE_FILE_NAME));
        await FsUtilities.rm(PathUtilities.resolve(root, 'src', 'app', 'app.spec.ts'));
    }

    private async setupTsConfig(root: string, projectName: string): Promise<void> {
        LogUtilities.step('Setting up the tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
                compilerOptions: {
                    moduleResolution: 'bundler' as unknown as ModuleResolutionKind,
                    isolatedModules: false
                }
            }
        );

        const eslintTsconfig: TsConfig = {
            compilerOptions: {
                outDir: './out-tsc/eslint',
                types: ['jasmine', 'node']
            },
            extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
            files: [
                'src/main.ts',
                'src/main.server.ts',
                'src/server.ts'
            ],
            include: [
                'src/**/*.spec.ts',
                'src/**/*.d.ts'
            ]
        };
        await FsUtilities.createFile(PathUtilities.resolve(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }
}