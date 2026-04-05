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
     * The root domain to use on stage.
     */
    stageRootDomain: string,
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
        name: 'prodRootDomain',
        message: 'prod root domain (eg. "test.com")',
        validate: (v?: string) => !!v
    },
    stageRootDomain: {
        type: 'input',
        name: 'stageRootDomain',
        message: 'stage root domain (eg. "test-staging.com")',
        validate: (v?: string) => !!v
    },
    email: {
        type: 'input',
        name: 'email',
        message: 'E-Mail (needed for ssl certificates)',
        validate: (v?: string) => !!v
    },
    setupGithubActions: {
        type: 'select',
        name: 'setupGithubActions',
        message: 'Setup Github Actions?',
        choices: [{ value: true, name: 'Yes' }, { value: false, name: 'No' }],
        default: true
    }
};