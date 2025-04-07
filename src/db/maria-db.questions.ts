import { QuestionsFor } from '../encapsulation';
import { OmitStrict } from '../types';
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
    dbServiceName: string,
    /**
     * The name of the default database to create.
     */
    databaseName: string
};

/**
 * Questions for getting a maria db config.
 */
export const mariaDbConfigQuestions: QuestionsFor<OmitStrict<MariaDbConfig, 'type' | 'databaseName'>> = {
    dbServiceName: {
        type: 'input',
        message: 'Compose service name',
        required: true,
        default: 'db'
    }
};