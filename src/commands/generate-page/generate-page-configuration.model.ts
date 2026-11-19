import { PathUtilities, QuestionsFor } from '../../encapsulation';
import { filterAsync } from '../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { AddType } from '../add/models/add-type.enum';

/**
 * Where a generated page is linked from.
 */
export type PagePlacement = 'navbar' | 'footer' | 'none';

/**
 * Configuration for generating a page of a website.
 */
export type GeneratePageConfiguration = {
    /**
     * The name of the website to generate the page for.
     */
    projectName: string,
    /**
     * The name of the page, as its link and its heading show it. Its route and its files are named after it.
     */
    pageName: string,
    /**
     * The title of the page, as the tab of the browser and the results of a search show it.
     */
    title: string,
    /**
     * What is on the page, for search engines and AI assistants.
     */
    description: string,
    /**
     * Where the page is linked from.
     */
    placement: PagePlacement
};

// what the values end up in: typescript strings and html
const TEXT_REGEX: RegExp = /^[^"'<>\\{}`]+$/;
const TEXT_MESSAGE: string = 'needs to be without quotes, "<", ">", "{", "}" and "\\"';

/**
 * Questions for getting the configuration for generating a page of a website.
 */
export const generatePageConfigurationQuestions: QuestionsFor<GeneratePageConfiguration> = {
    projectName: {
        message: 'Website',
        name: 'projectName',
        type: 'select',
        choices: async () => {
            const rootDir: string = PathUtilities.resolve('.');
            const websites: WorkspaceProject[] = await filterAsync(
                await WorkspaceUtilities.getProjects('apps', rootDir),
                async p => await WorkspaceUtilities.findProjectType(p.name, rootDir) === AddType.ANGULAR_WEBSITE
            );
            return websites.map(w => w.name);
        }
    },
    pageName: {
        message: 'Name of the page',
        name: 'pageName',
        type: 'input',
        validate: (v?: string) => v != undefined && /^[A-Za-z][\d A-Za-z]*$/.test(v)
            ? true
            : 'The name needs to start with a letter, and be letters, digits and spaces'
    },
    title: {
        message: 'Title, as search results show it',
        name: 'pageTitle',
        type: 'input',
        validate: (v?: string) => v != undefined && TEXT_REGEX.test(v) ? true : `The title ${TEXT_MESSAGE}`
    },
    description: {
        message: 'What is on the page, in one or two sentences',
        name: 'description',
        type: 'input',
        validate: (v?: string) => v != undefined && TEXT_REGEX.test(v) ? true : `The description ${TEXT_MESSAGE}`
    },
    placement: {
        message: 'Linked from',
        name: 'placement',
        type: 'select',
        choices: [
            { name: 'The navbar', value: 'navbar' },
            { name: 'The footer', value: 'footer' },
            { name: 'Nowhere', value: 'none' }
        ]
    }
};