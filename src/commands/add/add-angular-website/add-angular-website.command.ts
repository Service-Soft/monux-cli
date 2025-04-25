import { AngularUtilities, NavElementTypes } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, GIT_IGNORE_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities } from '../../../npm';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath, Path, toPascalCase } from '../../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { BaseAddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new angular website.
 */
type AddAngularWebsiteConfiguration = AddConfiguration & {
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
    titleSuffix: string,
    /**
     * Whether or not to setup tracking with ngx-material-tracking.
     */
    addTracking: boolean
};

/**
 * Command that handles adding an angular website to the monorepo.
 */
export class AddAngularWebsiteCommand extends BaseAddCommand<AddAngularWebsiteConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularWebsiteConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 4200
        },
        subDomain: {
            type: 'input',
            message: 'sub domain',
            required: false
        },
        titleSuffix: {
            type: 'input',
            message: 'title suffix (eg. "| My Company")',
            default: `| ${toPascalCase(this.baseConfig.name)}`,
            required: true
        },
        addTracking: {
            type: 'select',
            message: 'Add tracking?',
            choices: [{ value: true, name: 'Yes' }, { value: false, name: 'No' }],
            default: true
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularWebsiteConfiguration = await this.getConfig();
        const root: Path = await this.createProject(config);

        const prodRootDomain: string = await EnvUtilities.getEnvVariable(
            DefaultEnvKeys.PROD_ROOT_DOMAIN,
            'dev.docker-compose.yaml',
            getPath('.')
        );
        const domain: string = config.subDomain ? `${config.subDomain}.${prodRootDomain}` : prodRootDomain;

        await AngularUtilities.addSitemapAndRobots(root, config.name, domain);

        await this.cleanUp(root);
        await this.setupTsConfig(root, config.name);
        await this.createDockerfile(root, config);
        await AngularUtilities.setupNavigation(root, config.name);
        await EslintUtilities.setupProjectEslint(root, true);
        await this.setupTailwind(root);
        await DockerUtilities.addServiceToCompose(
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
            config.subDomain
        );
        await AngularUtilities.updateAngularJson(
            getPath(root, ANGULAR_JSON_FILE_NAME),
            { $schema: '../../node_modules/@angular/cli/lib/config/schema.json' }
        );
        await AngularUtilities.setupMaterial(root);
        await EnvUtilities.setupProjectEnvironment(root, false);
        await this.createDefaultPages(root, config.titleSuffix, domain);
        if (config.addTracking) {
            await AngularUtilities.setupTracking(config.name);
        }
        await NpmUtilities.updatePackageJson(config.name, { scripts: { start: `ng serve --port ${config.port}` } });
        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));
        await EnvUtilities.buildEnvironmentFileForApp(app, true, 'dev.docker-compose.yaml', getPath('.'));
    }

    private async createDefaultPages(root: Path, titleSuffix: string, domain: string): Promise<void> {
        await AngularUtilities.generatePage(root, 'Home', {
            addTo: 'navbar',
            rowIndex: 0,
            element: {
                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,
                title: 'Home',
                link: {
                    route: {
                        path: '',
                        title: `Home ${titleSuffix}`,
                        // @ts-ignore
                        // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
                    }
                }
            }
        }, domain);
        await AngularUtilities.generatePage(root, 'Imprint', {
            addTo: 'footer',
            rowIndex: 0,
            element: {
                type: NavElementTypes.INTERNAL_LINK,
                name: 'Imprint',
                route: {
                    path: 'imprint',
                    title: `Imprint ${titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/imprint/imprint.component').then(m => m.ImprintComponent)
                }
            }
        }, domain);
        await AngularUtilities.generatePage(root, 'Privacy', {
            addTo: 'footer',
            rowIndex: 0,
            element: {
                type: NavElementTypes.INTERNAL_LINK,
                name: 'Privacy',
                route: {
                    path: 'privacy',
                    title: `Privacy ${titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent)
                }
            }
        }, domain);
    }

    private async setupTailwind(root: string): Promise<void> {
        await TailwindUtilities.setupProjectTailwind(root);
        await FsUtilities.updateFile(getPath(root, 'src', 'styles.css'), [
            '@tailwind base;',
            '@tailwind components;',
            '@tailwind utilities;'
        ], 'append');
    }

    private async createDockerfile(root: string, config: AddAngularWebsiteConfiguration): Promise<void> {
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
                `COPY --from=build /home/node/root/${APPS_DIRECTORY_NAME}/${config.name}/dist/${config.name} ./`,
                'CMD node server/server.mjs'
            ]
        );
    }

    private async setupTsConfig(root: string, projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(projectName, { extends: '../../tsconfig.base.json' });

        const eslintTsconfig: TsConfig = {
            compilerOptions: {
                outDir: './out-tsc/eslint',
                types: ['jasmine', 'node']
            },
            extends: '../../tsconfig.base.json',
            files: [
                'src/main.ts',
                'src/main.server.ts',
                'server.ts'
            ],
            include: [
                'src/**/*.spec.ts',
                'src/**/*.d.ts'
            ]
        };
        await FsUtilities.createFile(getPath(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async cleanUp(root: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('cleans up');
        await FsUtilities.rm(getPath(root, '.vscode'));
        await FsUtilities.rm(getPath(root, '.editorconfig'));
        await FsUtilities.rm(getPath(root, GIT_IGNORE_FILE_NAME));
        await FsUtilities.rm(getPath(root, 'src', 'app', 'app.component.spec.ts'));
    }

    private async createProject(config: AddAngularWebsiteConfiguration): Promise<Path> {
        // eslint-disable-next-line no-console
        console.log('Creates the base website');
        AngularUtilities.runCommand(
            getPath(APPS_DIRECTORY_NAME),
            `new ${config.name}`,
            { '--skip-git': true, '--style': 'css', '--inline-style': true, '--ssr': true }
        );
        const newProject: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, getPath('.'));
        await FsUtilities.updateFile(getPath(newProject.path, 'src', 'app', 'app.component.html'), '', 'replace');
        await AngularUtilities.addProvider(newProject.path, 'provideHttpClient(withInterceptorsFromDi(), withFetch())', [
            // eslint-disable-next-line sonar/no-duplicate-string
            { defaultImport: false, element: 'provideHttpClient', path: '@angular/common/http' },
            { defaultImport: false, element: 'withInterceptorsFromDi', path: '@angular/common/http' },
            { defaultImport: false, element: 'withFetch', path: '@angular/common/http' }
        ]);
        return newProject.path;
    }
}