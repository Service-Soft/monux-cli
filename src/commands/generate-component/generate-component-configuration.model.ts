import { AngularLibraryUtilities } from '../../angular-library';
import { PathUtilities, QuestionsFor } from '../../encapsulation';
import { filterAsync } from '../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { AddType } from '../add/models/add-type.enum';

/**
 * Configuration for generating a component of an Angular library.
 */
export type GenerateComponentConfiguration = {
    /**
     * The name of the library to generate the component in.
     */
    projectName: string,
    /**
     * The name of the component. Its entry point, its classes and its selector are named after it.
     */
    componentName: string
};

/**
 * Questions for getting the configuration for generating a component of an Angular library.
 */
export const generateComponentConfigurationQuestions: QuestionsFor<GenerateComponentConfiguration> = {
    projectName: {
        message: 'Angular library',
        name: 'projectName',
        type: 'select',
        choices: async () => {
            const rootDir: string = PathUtilities.resolve('.');
            const libraries: WorkspaceProject[] = await filterAsync(
                await WorkspaceUtilities.getProjects('libs', rootDir),
                async p => await WorkspaceUtilities.findProjectType(p.name, rootDir) === AddType.ANGULAR_LIBRARY
            );
            return libraries.map(l => l.name);
        }
    },
    componentName: {
        message: 'Name of the component',
        name: 'componentName',
        type: 'input',
        validate: (v?: string) => AngularLibraryUtilities.validateComponentName(v)
    }
};