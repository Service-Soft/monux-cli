import { toSnakeCase } from '../utilities';
import { EnvironmentVariableKey } from './environment-variable-key.model';

/**
 * Defines default known environment keys.
 */
export abstract class DefaultEnvKeys {
    /**
     * The variable that defines if eg. Robots.txt should be genereated that allow crawling.
     */
    static readonly IS_PUBLIC: 'is_public' = 'is_public';

    /**
     * The variable that define the root domain to use in production, like test.com.
     */
    static readonly PROD_ROOT_DOMAIN: 'prod_root_domain' = 'prod_root_domain';

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
     * The database user environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbUser(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_db_user` as EnvironmentVariableKey;
    }

    /**
     * The database password environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbPassword(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_db_password` as EnvironmentVariableKey;
    }

    /**
     * The database name environment variable key for the project with the given name.
     * @param projectName - The name of the project to get the environment variable key for.
     * @returns The environment variable key.
     */
    static dbName(projectName: string): EnvironmentVariableKey {
        return `${toSnakeCase(projectName)}_database` as EnvironmentVariableKey;
    }
}