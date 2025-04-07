import { QuestionsFor } from '../encapsulation';
import { OmitStrict } from '../types';
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
     * The name of the database.
     */
    databaseName: string,
    /**
     * The name of the docker postgres service.
     */
    dbServiceName: string
};

/**
 * Questions for getting a postgres db config.
 */
export const postgresDbConfigQuestions: QuestionsFor<OmitStrict<PostgresDbConfig, 'type' | 'databaseName'>> = {
    dbServiceName: {
        type: 'input',
        message: 'Compose service name',
        required: true,
        default: 'db'
    }
};