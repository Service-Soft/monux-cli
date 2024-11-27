import { Dirent } from 'fs';
import path from 'path';

import { AngularUtilities, NavElementTypes } from '../../../angular';
import { ANGULAR_JSON_FILE_NAME, APPS_DIRECTORY_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models';
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
     * The domain that the website should be reached under.
     */
    domain: string,
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
export class AddAngularWebsiteCommand extends AddCommand<AddAngularWebsiteConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularWebsiteConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 4200
        },
        domain: {
            type: 'input',
            message: 'domain (eg. "www.test.com")',
            required: true
        },
        titleSuffix: {
            type: 'input',
            message: 'title suffix (eg. "| My Company")',
            default: `| ${this.baseConfig.name}`,
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
        const root: string = await this.createProject(config);
        await Promise.all([
            this.cleanUp(root),
            this.setupTsConfig(root, config.name),
            this.createDockerfile(root, config),
            AngularUtilities.addNavigation(root, config.name),
            EslintUtilities.setupProjectEslint(root, true),
            TailwindUtilities.setupProjectTailwind(root, true),
            DockerUtilities.addServiceToCompose({
                name: config.name,
                build: `./${root}`,
                volumes: [{ path: `/${config.name}` }]
            }),
            AngularUtilities.updateAngularJson(
                path.join(root, ANGULAR_JSON_FILE_NAME),
                { $schema: '../../node_modules/@angular/cli/lib/config/schema.json' }
            ),
            AngularUtilities.addSitemapAndRobots(root, config.name, config.domain)
        ]);
        await AngularUtilities.generatePage(root, 'Home', {
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
                        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
                    }
                }
            }
        }, config.domain);
        await AngularUtilities.generatePage(root, 'Imprint', {
            addTo: 'footer',
            rowIndex: 0,
            element: {
                type: NavElementTypes.INTERNAL_LINK,
                name: 'Imprint',
                route: {
                    path: 'imprint',
                    title: `Imprint ${config.titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/imprint/imprint.component').then(m => m.ImprintComponent)
                }
            }
        }, config.domain);
        await AngularUtilities.generatePage(root, 'Privacy', {
            addTo: 'footer',
            rowIndex: 0,
            element: {
                type: NavElementTypes.INTERNAL_LINK,
                name: 'Privacy',
                route: {
                    path: 'privacy',
                    title: `Privacy ${config.titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent)
                }
            }
        }, config.domain);
        if (config.addTracking) {
            await AngularUtilities.addTracking(config.name);
        }
    }

    private async createDockerfile(root: string, config: AddAngularWebsiteConfiguration): Promise<void> {
        await FsUtilities.createFile(
            path.join(root, 'Dockerfile'),
            [
                'FROM node:20 AS build-stage',
                '# Set to a non-root built-in user `node`',
                'USER node',
                'RUN mkdir -p /home/node/app',
                'COPY --chown=node . /home/node/app',
                'WORKDIR /home/node/app',
                'RUN npm install',
                'RUN npm run build --omit=dev',
                '',
                'FROM node:20',
                'WORKDIR /usr/app',
                `COPY --from=build /home/node/app/dist/${config.name} ./`,
                `EXPOSE ${config.port}`,
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
        await FsUtilities.createFile(path.join(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async cleanUp(root: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('cleans up');
        await FsUtilities.rm(path.join(root, '.vscode'));
        await FsUtilities.rm(path.join(root, '.editorconfig'));
        await FsUtilities.rm(path.join(root, '.gitignore'));
        await FsUtilities.rm(path.join(root, 'src', 'app', 'app.component.spec.ts'));
    }

    private async createProject(config: AddAngularWebsiteConfiguration): Promise<string> {
        // eslint-disable-next-line no-console
        console.log('Creates the base website');
        AngularUtilities.runCommand(APPS_DIRECTORY_NAME, `new ${config.name}`, { '--skip-git': true, '--style': 'scss', '--ssr': true });
        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        await FsUtilities.updateFile(path.join(root, 'src', 'app', 'app.component.html'), '', 'replace');
        return root;
    }
}