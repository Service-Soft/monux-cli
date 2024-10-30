import { Dirent } from 'fs';
import path from 'path';

import { LIBS_DIRECTORY_NAME } from '../../../constants';
import { FsUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities } from '../../../npm';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceConfig, WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models/add-command.class';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 *
 */
type TsLibraryConfiguration = AddConfiguration & {
    /**
     *
     */
    scope: string
};

/**
 *
 */
export class AddTsLibraryCommand extends AddCommand<TsLibraryConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<TsLibraryConfiguration, keyof AddConfiguration>> = {
        scope: {
            type: 'input',
            required: true,
            message: 'scope',
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return `@${workspaceConfig.name}`;
            }
        }
    };

    override async run(): Promise<void> {
        const config: TsLibraryConfiguration = await this.getConfig();
        const root: string = await this.createProject(config);
        await FsUtilities.mkdir(path.join(root, 'src'));
        await FsUtilities.createFile(path.join(root, 'src', 'index.ts'), '');

        await Promise.all([
            EslintUtilities.setupProjectEslint(root, false, 'tsconfig.json'),
            this.setupTsConfig(config.name),
            this.updateBaseTsConfig(config, root)
        ]);

        await this.installInProjects(config);
    }

    private async installInProjects(config: TsLibraryConfiguration): Promise<void> {
        const projects: Dirent[] = await WorkspaceUtilities.getProjects();
        const npmPackage: string = `${config.scope}/${config.name}`;
        await Promise.all(projects.map((p) => NpmUtilities.install(p.name, [npmPackage])));
    }

    /**
     *
     * @param config
     * @param root
     */
    private async updateBaseTsConfig(config: TsLibraryConfiguration, root: string): Promise<void> {
        await TsConfigUtilities.updateBaseTsConfig({
            compilerOptions: {
                paths: {
                    [`${config.scope}/${config.name}`]: [root]
                }
            }
        });
    }

    private async setupTsConfig(projectName: string): Promise<void> {
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: '../../tsconfig.base.json',
                compilerOptions: {
                    composite: true,
                    declaration: true,
                    outDir: './build',
                    rootDir: './src'
                },
                include: undefined
            }
        );
    }

    private async createProject(config: TsLibraryConfiguration): Promise<string> {
        console.log('Creates the library');
        const libraryPath: string = path.join(LIBS_DIRECTORY_NAME, config.name);
        await NpmUtilities.init({ path: libraryPath, scope: config.scope });
        TsConfigUtilities.init(libraryPath);
        await NpmUtilities.install(config.name, ['typescript'], true);
        await NpmUtilities.updatePackageJson(
            config.name,
            {
                main: 'build/index.js',
                scripts: { build: 'tsc --build', prepare: 'npm run build' }
            }
        );
        return libraryPath;
    }
}