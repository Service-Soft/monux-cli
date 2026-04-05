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
    dbType: DbType.MARIADB,
    /**
     * The name of the docker mariadb service.
     */
    dbComposeServiceName: string,
    /**
     * The name of the default database to create.
     */
    databaseName: string
};

/**
 * Questions for getting a maria db config.
 */
export const mariaDbConfigQuestions: QuestionsFor<OmitStrict<MariaDbConfig, 'dbType' | 'databaseName'>> = {
    dbComposeServiceName: {
        type: 'input',
        name: 'dbComposeServiceName',
        message: 'Compose service name',
        validate: (v?: string) => !!v,
        default: 'db'
    }
};