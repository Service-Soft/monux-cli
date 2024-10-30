/* eslint-disable no-console */
import { Dirent } from 'fs';
import path from 'path';

import { AngularUtilities } from '../../../angular';
import { APPS_DIRECTORY_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { CPUtilities, FsUtilities, JsonUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities } from '../../../npm';
import { TailwindUtilities } from '../../../tailwind';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models/add-command.class';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 *
 */
type AddAngularConfiguration = AddConfiguration & {
    /**
     *
     */
    port: number
};

/**
 *
 */
export class AddAngularCommand extends AddCommand<AddAngularConfiguration> {
    protected override readonly configQuestions: QuestionsFor<OmitStrict<AddAngularConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 4200
        }
    };

    override async run(): Promise<void> {
        const config: AddAngularConfiguration = await this.getConfig();
        const root: string = await this.createProject(config);
        await Promise.all([
            this.cleanUp(root),
            this.setupTsConfig(root, config.name),
            this.createDockerfile(root, config),
            AngularUtilities.addPwaSupport(root, config.name),
            AngularUtilities.addNavigation(root, config.name),
            EslintUtilities.setupProjectEslint(root, true),
            TailwindUtilities.setupProjectTailwind(root),
            DockerUtilities.addServiceToCompose({
                name: config.name,
                build: `./${root}`,
                volumes: [{ path: `/${config.name}` }]
            }),
            NpmUtilities.install(config.name, ['ngx-persistence-logger'])
        ]);
    }

    /**
     *
     * @param root
     * @param config
     */
    protected async createDockerfile(root: string, config: AddAngularConfiguration): Promise<void> {
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

    private async createProject(config: AddAngularConfiguration): Promise<string> {
        console.log('Creates the base app');
        CPUtilities.execSync(`cd ${APPS_DIRECTORY_NAME} && npx @angular/cli new ${config.name} --skip-git --style=scss --ssr`);
        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        await FsUtilities.updateFile(path.join(root, 'src', 'app', 'app.component.html'), '', 'replace');
        return root;
    }

    private async cleanUp(root: string): Promise<void> {
        console.log('cleans up');
        await FsUtilities.rm(path.join(root, '.vscode'));
        await FsUtilities.rm(path.join(root, '.editorconfig'));
        await FsUtilities.rm(path.join(root, '.gitignore'));
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