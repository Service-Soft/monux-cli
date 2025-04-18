import { QuestionsFor } from '../../encapsulation';

/**
 * Configuration for initializing a monorepo.
 */
export type InitConfiguration = {
    /**
     * The root domain to use in production.
     */
    prodRootDomain: string,
    /**
     * The email of the user.
     * Is needed for lets encrypt configuration.
     */
    email: string,
    /**
     * Whether or not to setup github actions.
     */
    setupGithubActions: boolean
};

/**
 * Questions for getting the init configuration.
 */
export const initConfigQuestions: QuestionsFor<InitConfiguration> = {
    prodRootDomain: {
        type: 'input',
        message: 'prod root domain (eg. "test.com")',
        required: true
    },
    email: {
        type: 'input',
        message: 'E-Mail (needed for ssl certificates)',
        required: true
    },
    setupGithubActions: {
        type: 'select',
        message: 'Setup Github Actions?',
        choices: [{ value: true, name: 'Yes' }, { value: false, name: 'No' }],
        default: true
    }
};