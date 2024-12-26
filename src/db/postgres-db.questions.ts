import { QuestionsFor } from '../encapsulation';

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
        required: true
    },
    database: {
        type: 'input',
        message: 'Database',
        required: true
    }
};