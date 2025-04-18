/**
 * Configuration for running the down command.
 */
export type DownConfiguration = {
    /**
     * Paths of all docker files of a monorepo.
     */
    dockerFilePaths: string[],
    /**
     * The name of the Monux repo to run down for.
     */
    projectName: string
};