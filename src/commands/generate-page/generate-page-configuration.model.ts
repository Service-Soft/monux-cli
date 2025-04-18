import { QuestionsFor } from '../../encapsulation';
import { getPath } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';

/**
 * Configuration for generating an angular page.
 */
export type GeneratePageConfiguration = {
    /**
     * The name of the project to generate the page for.
     */
    projectName: string,
    /**
     * The name of the page to generate.
     */
    pageName: string,
    /**
     * The route under which the page should be reachable.
     */
    route: string,
    /**
     * The meta title of the page.
     */
    title: string
};

/**
 * Questions for getting the configuration for generating an angular page.
 */
export const generatePageConfigurationQuestions: QuestionsFor<GeneratePageConfiguration> = {
    projectName: {
        message: 'Project',
        type: 'select',
        choices: async () => (await WorkspaceUtilities.getProjects('apps', getPath('.'))).map(a => a.name)
    },
    pageName: {
        message: 'Page name',
        type: 'input',
        required: true
    },
    route: {
        message: 'Route',
        type: 'input',
        required: true
    },
    title: {
        message: 'Title',
        type: 'input',
        required: true
    }
};