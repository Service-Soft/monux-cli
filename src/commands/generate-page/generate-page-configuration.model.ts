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
        name: 'projectName',
        type: 'select',
        choices: async () => (await WorkspaceUtilities.getProjects('apps', getPath('.'))).map(a => a.name)
    },
    pageName: {
        message: 'Page name',
        name: 'pageName',
        type: 'input',
        validate: (v?: string) => !!v
    },
    route: {
        message: 'Route',
        name: 'route',
        type: 'input',
        validate: (v?: string) => !!v
    },
    title: {
        message: 'Title',
        name: 'title',
        type: 'input',
        validate: (v?: string) => !!v
    }
};