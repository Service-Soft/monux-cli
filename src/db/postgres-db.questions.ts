import { QuestionsFor } from '../encapsulation';
import { OmitStrict } from '../types';
import { WorkspaceUtilities } from '../workspace';
import { DbType } from './db-type.enum';

/**
 * Configuration for creating a postgres db.
 */
export type PostgresDbConfig = {
    /**
     * The type of the database.
     */
    type: DbType.POSTGRES,
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
export const postgresDbConfigQuestions: QuestionsFor<OmitStrict<PostgresDbConfig, 'type'>> = {
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