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