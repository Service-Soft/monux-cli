import { LogUtilities, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmUtilities } from '../../../npm';
import { TsLibraryUtilities } from '../../../ts-library';
import { OmitStrict } from '../../../types';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, BaseAddCommand } from '../models';

/**
 * Configuration for creating a new ts library.
 */
type TsLibraryConfiguration = AddConfiguration & {
    /**
     * The scope of the library, eg. '@project'.
     */
    scope: string,
    /**
     * The names of the projects that use the library.
     */
    projects: string[]
};

/**
 * The command for adding a typescript library to the monorepo.
 */
export class AddTsLibraryCommand extends BaseAddCommand<TsLibraryConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<TsLibraryConfiguration, keyof AddConfiguration>> = {
        scope: {
            type: 'input',
            name: 'scope',
            message: 'Scope',
            validate: (v?: string) => !!v,
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return `@${workspaceConfig.name}`;
            }
        },
        projects: {
            type: 'checkbox',
            name: 'projects',
            message: 'Projects that use the library',
            choices: async () => (await WorkspaceUtilities.getProjects('all', PathUtilities.resolve('.')))
                .filter(p => p.name !== this.baseConfig.name)
                .map(p => p.name)
        }
    };

    protected override async run(): Promise<void> {
        const config: TsLibraryConfiguration = await this.getConfig();
        const library: WorkspaceProject = await TsLibraryUtilities.create(config.name, `${config.scope}/${config.name}`);
        await EslintUtilities.fix(library.path);
        await NpmUtilities.run(config.name, 'build', false);
        for (const project of config.projects) {
            await TsLibraryUtilities.install(library, project);
        }
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), library.path)}`);
    }
}