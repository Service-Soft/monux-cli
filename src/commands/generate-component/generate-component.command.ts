import { AngularLibraryUtilities } from '../../angular-library';
import { InquirerUtilities, LogUtilities, PathUtilities } from '../../encapsulation';
import { EslintUtilities } from '../../eslint';
import { NpmUtilities } from '../../npm';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { GenerateComponentConfiguration, generateComponentConfigurationQuestions } from './generate-component-configuration.model';

/**
 * Generates a component of an Angular library, as an entry point of its own with its config, its test and its stories.
 */
export class GenerateComponentCommand extends BaseCommand<GenerateComponentConfiguration> {
    protected override readonly insideWorkspace: boolean = true;
    protected override readonly restoresWorkspace: boolean = true;

    protected override async run(input: GenerateComponentConfiguration): Promise<void> {
        const library: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(input.projectName, PathUtilities.resolve('.'));
        const entryPoint: string = await AngularLibraryUtilities.addComponent(library, input.componentName);
        await EslintUtilities.fix(library.path);
        const packageName: string = await NpmUtilities.resolvePackageName(library);
        LogUtilities.success(`Generated the component "${input.componentName}", imported from "${packageName}/${entryPoint}"`);
    }

    protected override async resolveInput(): Promise<GenerateComponentConfiguration> {
        return await InquirerUtilities.prompt(generateComponentConfigurationQuestions);
    }
}