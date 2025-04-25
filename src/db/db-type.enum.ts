/**
 * The possible database systems that can be used.
 */
export enum DbType {
    POSTGRES = 'postgres',
    MARIADB = 'mariadb'
}

/**
 * The default port for database servers of the given type.
 */
export const defaultPortForDbType: Record<DbType, number> = {
    [DbType.POSTGRES]: 5432,
    [DbType.MARIADB]: 3306
};