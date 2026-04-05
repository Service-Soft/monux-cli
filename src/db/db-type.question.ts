
import { QuestionsFor } from '../encapsulation';
import { DbType } from './db-type.enum';

/**
 * Type for getting the database type from user input.
 */
type DbTypeConfig = {
    /**
     * The type of the database system to use.
     */
    dbType: DbType
};

/**
 * Questions for getting a db type config.
 */
export const dbTypeQuestion: QuestionsFor<DbTypeConfig> = {
    dbType: {
        type: 'select',
        name: 'dbType',
        message: 'database type',
        default: DbType.POSTGRES,
        choices: Object.values(DbType)
    }
};