import { QuestionsFor } from '../encapsulation';
import { OmitStrict } from '../types';
import { WorkspaceUtilities } from '../workspace';
import { DbType } from './db-type.enum';

/**
 * Configuration for creating a maria db.
 */
export type MariaDbConfig = {
    /**
     * The type of the databases.
     */
    type: DbType.MARIADB,
    /**
     * The name of the mariadb service.
     */
    name: string,
    /**
     * The name of the default database to create.
     */
    database: string
};

/**
 * Questions for getting a maria db config.
 */
export const mariaDbConfigQuestions: QuestionsFor<OmitStrict<MariaDbConfig, 'type'>> = {
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