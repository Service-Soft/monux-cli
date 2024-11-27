import { Dirent } from 'fs';
import path from 'path';

import { APPS_DIRECTORY_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { DockerUtilities } from '../../../docker';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
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
     * Whether or not to add lbx-change-sets.
     */
    addChangeHistory: boolean
    // TODO
    // dbConfig: LbDatabaseConfig
};

/**
 * Command that handles adding a loopback api to the monorepo.
 */
export class AddLoopbackCommand extends AddCommand<AddLoopbackConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<AddLoopbackConfiguration, keyof AddConfiguration>> = {
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
            EslintUtilities.setupProjectEslint(root, true, TS_CONFIG_FILE_NAME),
            DockerUtilities.addServiceToCompose({
                name: config.name,
                build: `./${root}`,
                volumes: [{ path: `/${config.name}` }]
            })
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
            FsUtilities.rm(path.join(root, '.gitignore')),
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