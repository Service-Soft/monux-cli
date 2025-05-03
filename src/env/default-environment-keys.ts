import { toSnakeCase } from '../utilities';
import { EnvironmentVariableKey } from './environment-variable-key.model';

/**
 * Defines default known environment keys.
 */
export abstract class DefaultEnvKeys {
    /**
     * The variable that defines the currently used environment.
     */
    static readonly ENV: 'env' = 'env';
    /**
     * The variable that defines the root domain to use in production, like test.com.
     */
    static readonly PROD_ROOT_DOMAIN: 'prod_root_domain' = 'prod_root_domain';
    /**
     * The variable that defines the root domain to use in stage, like my-test-site.com.
     */
    static readonly STAGE_ROOT_DOMAIN: 'stage_root_domain' = 'stage_root_domain';
    /**
     * The username of the basic auth user for stage.
     */
    static readonly BASIC_AUTH_USER: 'basic_auth_user' = 'basic_auth_user';
    /**
     * The password of the basic auth user for stage.
     */
    static readonly BASIC_AUTH_PASSWORD: 'basic_auth_password' = 'basic_auth_password';
    /**
     * The variable that is used to generate access tokens.
     */
    static readonly ACCESS_TOKEN_SECRET: 'access_token_secret' = 'access_token_secret';
    /**
     * The variable that is used to generate refresh tokens.
     */
    static readonly REFRESH_TOKEN_SECRET: 'refresh_token_secret' = 'refresh_token_secret';
    /**
     * The username/email variable of the webserver user for automatic emails.
     */
    static readonly WEBSERVER_MAIL_USER: 'webserver_mail_user' = 'webserver_mail_user';
    /**
     * The password variable of the webserver user for automatic emails.
     */
    static readonly WEBSERVER_MAIL_PASSWORD: 'webserver_mail_password' = 'webserver_mail_password';
    /**
     * The host variable of the webserver for automatic emails.
     */
    static readonly WEBSERVER_MAIL_HOST: 'webserver_mail_host' = 'webserver_mail_host';
    /**
     * The port variable of the webserver for automatic emails.
     */
    static readonly WEBSERVER_MAIL_PORT: 'webserver_mail_port' = 'webserver_mail_port';

    /**
     * The domain environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static domain(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_domain` as EnvironmentVariableKey;
    }

    /**
     * The port environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static port(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_port` as EnvironmentVariableKey;
    }

    /**
     * The sub domain environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static subDomain(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_sub_domain` as EnvironmentVariableKey;
    }

    /**
     * The base url environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static baseUrl(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_base_url` as EnvironmentVariableKey;
    }

    /**
     * The database user environment variable key for the database with the given name.
     * @param dbServiceName - The docker service name of the database.
     * @param databaseName - The name of the database to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbUser(dbServiceName: string, databaseName: string): EnvironmentVariableKey {
        return `${toSnakeCase(dbServiceName)}_${toSnakeCase(databaseName)}_db_user` as EnvironmentVariableKey;
    }

    /**
     * The database password environment variable key for the database with the given name.
     * @param dbServiceName - The docker service name of the database.
     * @param databaseName - The name of the database to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbPassword(dbServiceName: string, databaseName: string): EnvironmentVariableKey {
        return `${toSnakeCase(dbServiceName)}_${toSnakeCase(databaseName)}_db_password` as EnvironmentVariableKey;
    }

    /**
     * The host environment variable key for the docker service with the given name.
     * @param dbServiceName - The docker service name of the database.
     * @returns The environment variable key.
     */
    static dbHost(dbServiceName: string): EnvironmentVariableKey {
        return `${toSnakeCase(dbServiceName)}_db_host` as EnvironmentVariableKey;
    }

    /**
     * The root password variable key for the docker service with the given name.
     * @param dbServiceName - The docker service name of the database.
     * @returns The environment variable key.
     */
    static dbRootPassword(dbServiceName: string): EnvironmentVariableKey {
        return `${toSnakeCase(dbServiceName)}_db_root_password` as EnvironmentVariableKey;
    }

    /**
     * The database name environment variable key for the database with the given name.
     * @param dbServiceName - The docker service name of the database.
     * @param databaseName - The name of the database to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbName(dbServiceName: string, databaseName: string): EnvironmentVariableKey {
        return `${toSnakeCase(dbServiceName)}_${toSnakeCase(databaseName)}_database` as EnvironmentVariableKey;
    }

    /**
     * The email environment variable key for the default user to create on initialization.
     * @param apiProjectName - The docker service name of the api to create the user for.
     * @returns The environment variable key.
     */
    static defaultUserEmail(apiProjectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(apiProjectName)}_default_user_email` as EnvironmentVariableKey;
    }

    /**
     * The password environment variable key for the default user to create on initialization.
     * @param apiProjectName - The docker service name of the api to create the user for.
     * @returns The environment variable key.
     */
    static defaultUserPassword(apiProjectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(apiProjectName)}_default_user_password` as EnvironmentVariableKey;
    }
}