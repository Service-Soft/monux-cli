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
    dbType: DbType.POSTGRES,
    /**
     * The name of the database.
     */
    databaseName: string,
    /**
     * The name of the docker postgres service.
     */
    dbComposeServiceName: string
};

/**
 * Questions for getting a postgres db config.
 */
export const postgresDbConfigQuestions: QuestionsFor<OmitStrict<PostgresDbConfig, 'dbType' | 'databaseName'>> = {
    dbComposeServiceName: {
        type: 'input',
        name: 'dbComposeServiceName',
        message: 'Compose service name',
        validate: (v?: string) => !!v,
        default: 'db'
    }
};