/* eslint-disable no-console */
import { Dirent } from 'fs';
import path from 'path';

import { AngularUtilities, NavElementTypes } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, APP_CONFIG_FILE_NAME, APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, GIT_IGNORE_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { toPascalCase, toSnakeCase } from '../../../utilities';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models/add-command.class';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new angular app.
 */
type AddAngularConfiguration = AddConfiguration & {
    /**
     * The domain that the app should be reached under.
     */
    domain: string,
    /**
     * The base url that the app should be reached under.
     */
    baseUrl: string,
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
     * Suffix for the html title (eg. "| My Company").
     */
    titleSuffix: string
};

/**
 * Command that handles adding an angular application to the monorepo.
 */
export class AddAngularCommand extends AddCommand<AddAngularConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddAngularConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 4200
        },
        domain: {
            type: 'input',
            message: 'domain (eg. "localhost:4200" or "admin.test.com")',
            required: true,
            default: 'localhost:4200'
        },
        baseUrl: {
            type: 'input',
            message: 'base url',
            default: 'http://localhost:4200',
            required: true
        },
        titleSuffix: {
            type: 'input',
            message: 'title suffix (eg. "| My Company")',
            required: true,
            default: `| ${toPascalCase(this.baseConfig.name)}`
        },
        apiName: {
            type: 'input',
            message: 'name of the api to use',
            required: true,
            default: 'api'
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularConfiguration = await this.getConfig();
        const root: string = await this.createProject(config);
        await Promise.all([
            this.cleanUp(root),
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
                    volumes: [{ path: `/${config.name}` }],
                    labels: DockerUtilities.getTraefikLabels(config.name, 4000)
                },
                config.domain,
                config.baseUrl
            ),
            AngularUtilities.updateAngularJson(
                path.join(root, ANGULAR_JSON_FILE_NAME),
                { $schema: '../../node_modules/@angular/cli/lib/config/schema.json' }
            ),
            AngularUtilities.setupMaterial(root)
        ]);

        await AngularUtilities.setupNavigation(root, config.name);
        await AngularUtilities.setupLogging(root, config.name, config.apiName);
        await AngularUtilities.setupAuth(root, config.name, config.apiName, config.domain, config.titleSuffix);
        await AngularUtilities.setupChangeSets(root, config.name, config.apiName);
        await AngularUtilities.setupPwa(root, config.name);
        await FsUtilities.replaceInFile(
            path.join(root, 'src', 'app', APP_CONFIG_FILE_NAME),
            '\'ALLOWED_DOMAINS_PLACEHOLDER\'',
            `environment.${toSnakeCase(config.apiName)}_domain`
        );
        await NpmUtilities.install(config.name, [NpmPackage.NGX_MATERIAL_ENTITY]);

        await this.createDefaultPages(root, config);

        await NpmUtilities.updatePackageJson(config.name, { scripts: { start: `ng serve --port ${config.port}` } });

        const app: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        await EnvUtilities.buildEnvironmentFileForApp(app, '', false);
    }

    private async setupTailwind(root: string): Promise<void> {
        await TailwindUtilities.setupProjectTailwind(root);
        await FsUtilities.updateFile(path.join(root, 'src', 'styles.css'), [
            '@tailwind base;',
            '@tailwind components;',
            '@tailwind utilities;'
        ], 'append');
    }

    private async createDefaultPages(root: string, config: AddAngularConfiguration): Promise<void> {
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
            path.join(root, DOCKER_FILE_NAME),
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

    private async createProject(config: AddAngularConfiguration): Promise<string> {
        console.log('Creates the base app');
        AngularUtilities.runCommand(
            APPS_DIRECTORY_NAME,
            `new ${config.name}`,
            { '--skip-git': true, '--style': 'css', '--inline-style': true, '--ssr': true }
        );
        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        await FsUtilities.updateFile(path.join(root, 'src', 'app', 'app.component.html'), '', 'replace');
        await AngularUtilities.addProvider(root, 'provideHttpClient(withInterceptorsFromDi(), withFetch())', [
            { defaultImport: false, element: 'provideHttpClient', path: '@angular/common/http' },
            { defaultImport: false, element: 'withInterceptorsFromDi', path: '@angular/common/http' }
        ]);
        return root;
    }

    private async cleanUp(root: string): Promise<void> {
        console.log('cleans up');
        await FsUtilities.rm(path.join(root, '.vscode'));
        await FsUtilities.rm(path.join(root, '.editorconfig'));
        await FsUtilities.rm(path.join(root, GIT_IGNORE_FILE_NAME));
        await FsUtilities.rm(path.join(root, 'src', 'app', 'app.component.spec.ts'));
    }

    private async setupTsConfig(root: string, projectName: string): Promise<void> {
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
        await FsUtilities.createFile(path.join(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }
}