import { QuestionsFor } from '../encapsulation';
import { WorkspaceUtilities } from '../workspace';

/**
 * Configuration for creating a postgres db.
 */
export type PostgresDbConfig = {
    /**
     * The name of the postgres service.
     */
    name: string,
    /**
     * The name of the default database to create.
     */
    database: string
};

/**
 * Questions for getting a postgres db config.
 */
export const postgresDbConfigQuestions: QuestionsFor<PostgresDbConfig> = {
    name: {
        type: 'input',
        message: 'Name',
        required: true,
        default: 'db'
    },
    database: {
        type: 'input',
        message: 'Database',
        required: true,
        default: async () => (await WorkspaceUtilities.getConfig())?.name
    }
};