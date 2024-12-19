import { Dirent } from 'fs';
import path from 'path';

import { APPS_DIRECTORY_NAME, DOCKER_FILE_NAME, GIT_IGNORE_FILE_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
import { EnvUtilities } from '../../../env';
import { EslintUtilities } from '../../../eslint';
import { LoopbackUtilities } from '../../../loopback';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for adding a new loopback api.
 */
type AddLoopbackConfiguration = AddConfiguration & {
    /**
     * The domain that the website should be reached under.
     */
    domain: string,
    /**
     * Whether or not to add lbx-change-sets.
     */
    addChangeHistory: boolean,
    /**
     * The port that should be used by the application.
     * @default 3000
     */
    port: number
    // TODO
    // dbConfig: LbDatabaseConfig
};

/**
 * Command that handles adding a loopback api to the monorepo.
 */
export class AddLoopbackCommand extends AddCommand<AddLoopbackConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<AddLoopbackConfiguration, keyof AddConfiguration>> = {
        port: {
            type: 'number',
            message: 'port',
            required: true,
            default: 3000
        },
        domain: {
            type: 'input',
            message: 'domain (eg. "admin.localhost" or "admin.test.com")',
            required: true
        },
        addChangeHistory: {
            type: 'select',
            message: 'Add change history?',
            choices: [{ value: true, name: 'Yes' }, { value: false, name: 'No' }],
            default: true
        }
        // dbConfig: {

        // }
    };

    override async run(): Promise<void> {
        const config: AddLoopbackConfiguration = await this.getConfig();
        const root: string = await this.createProject(config);

        await Promise.all([
            this.setupTsConfig(root, config.name),
            EslintUtilities.setupProjectEslint(root, true, false, TS_CONFIG_FILE_NAME),
            DockerUtilities.addServiceToCompose(
                {
                    name: config.name,
                    build: {
                        dockerfile: `./${root}/${DOCKER_FILE_NAME}`,
                        context: '.'
                    },
                    volumes: [{ path: `/${config.name}` }],
                    labels: DockerUtilities.getTraefikLabels(config.name, 3000)
                },
                config.domain
            ),
            EnvUtilities.setupProjectEnvironment(root, false)
        ]);
    }

    private async createProject(config: AddLoopbackConfiguration): Promise<string> {
        LoopbackUtilities.runCommand(APPS_DIRECTORY_NAME, `new ${config.name}`, {
            '--yes': true,
            '--config': {
                docker: true,
                eslint: false,
                mocha: true,
                loopbackBuild: true,
                prettier: false,
                vscode: false
            }
        });
        const newProject: Dirent = await WorkspaceUtilities.findProjectOrFail(config.name);
        const root: string = path.join(newProject.parentPath, newProject.name);
        await Promise.all([
            FsUtilities.rm(path.join(root, 'src', '__tests__')),
            FsUtilities.rm(path.join(root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(path.join(root, 'DEVELOPING.md')),
            FsUtilities.rm(path.join(root, 'src', 'controllers', 'ping.controller.ts')),
            FsUtilities.updateFile(path.join(root, 'src', 'controllers', 'index.ts'), '', 'replace')
        ]);
        return root;
    }

    private async setupTsConfig(root: string, projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(projectName, { extends: '../../tsconfig.base.json' });
    }
}