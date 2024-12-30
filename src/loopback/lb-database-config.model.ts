/**
 * Base configuration for all datasources.
 */
interface BaseLbDbConfig {
    /**
     * The name of the datasource used in loopback.
     */
    readonly name: string,
    /**
     * The connector of the datasource, always 'postgresql'.
     */
    readonly connector: 'postgresql' | 'mysql',
    /**
     * The url of the connection (eg: mysql://user:pass@host/db).
     */
    readonly url: string,
    /**
     * The host of the db. Usually 127.0.0.1.
     */
    readonly host: string,
    /**
     * The port of the db. Usually 3306.
     */
    readonly port: number,
    /**
     * The user that is used to access to the database.
     */
    readonly user: string,
    /**
     * The password of the user.
     */
    readonly password: string,
    /**
     * The specific database on the sql server that this api should use.
     */
    readonly database: string
}

/**
 * Configuration options for a postgres database connection.
 */
interface LbPostgresDbConfig extends BaseLbDbConfig {
    /**
     * The connector of the datasource, always 'postgresql'.
     */
    readonly connector: 'postgresql'
}

/**
 * Configuration options for a mysql database connection.
 */
interface LbMySqlDbConfig extends BaseLbDbConfig {
    /**
     * The connector of the datasource, always 'mysql'.
     */
    readonly connector: 'mysql'
}

/**
 * Configuration for a loopback database.
 */
export type LbDatabaseConfig = LbPostgresDbConfig | LbMySqlDbConfig;