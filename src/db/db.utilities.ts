import { Dirent } from 'fs';

import { DATABASES_DIRECTORY_NAME, DEV_DOCKER_COMPOSE_FILE_NAME, DockerComposeFileName } from '../constants';
import { ComposeService, DockerUtilities } from '../docker';
import { FsUtilities, InquirerUtilities, JsonUtilities, QuestionsFor } from '../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities } from '../env';
import { generatePlaceholderPassword, getPath, toKebabCase, toSnakeCase } from '../utilities';
import { DbType } from './db-type.enum';
import { dbTypeQuestion } from './db-type.question';
import { MariaDbConfig, mariaDbConfigQuestions } from './maria-db.questions';
import { PostgresDbConfig, postgresDbConfigQuestions } from './postgres-db.questions';

/**
 * Configuration for selecting a database.
 */
type DbConfig = {
    /**
     * The database service to be used by the api.
     */
    dbServiceName: string,
    /**
     * The name of the database.
     */
    databaseName: string
};

/**
 * Configuration for creating a bash init script.
 */
type DbInitConfig = {
    /**
     * The type od the database system to use.
     */
    type: DbType,
    /**
     * The variable key for the database name.
     */
    nameEnvVariable: EnvironmentVariableKey,
    /**
     * The variable key for the database user.
     */
    userEnvVariable: EnvironmentVariableKey,
    /**
     * The variable key for the database users password.
     */
    passwordEnvVariable: EnvironmentVariableKey
};

/**
 * Utilities for handling databases.
 */
export abstract class DbUtilities {

    private static readonly POSTGRES_VERSION: number = 16;

    private static readonly MARIADB_VERSION: number = 11;

    /**
     * Creates the bash init files for setting up default databases and users.
     * @param fileName - The docker compose file get the variables for.
     */
    static async createInitFiles(fileName: DockerComposeFileName): Promise<void> {
        const dbs: ComposeService[] = await this.getAvailableDatabases();
        for (const db of dbs) {
            const configs: DbInitConfig[] = await this.getInitConfigsForDb(db.name);
            for (let i: number = 0; i < configs.length; i++) {
                const initFileSh: string = getPath(DATABASES_DIRECTORY_NAME, toKebabCase(db.name), 'init', `${i}.sh`);
                const initFileSql: string = getPath(DATABASES_DIRECTORY_NAME, toKebabCase(db.name), 'init', `${i}.sql`);
                await FsUtilities.rm(initFileSh);
                await FsUtilities.rm(initFileSql);
                await this.createInitFile(configs[i], initFileSh, initFileSql, fileName);
            }
        }
    }

    private static async createInitFile(
        config: DbInitConfig,
        initFileSh: string,
        initFileSql: string,
        fileName: DockerComposeFileName
    ): Promise<void> {
        const dbName: string = await EnvUtilities.getEnvVariable(config.nameEnvVariable, fileName);
        const dbUser: string = await EnvUtilities.getEnvVariable(config.userEnvVariable, fileName);
        const dbPassword: string = await EnvUtilities.getEnvVariable(config.passwordEnvVariable, fileName);

        switch (config.type) {
            case DbType.POSTGRES: {
                await FsUtilities.createFile(
                    initFileSh,
                    [
                        '#!/bin/bash',
                        // eslint-disable-next-line stylistic/max-len
                        `psql -tc "SELECT 1 FROM pg_database WHERE datname = '${dbName}'" | grep -q 1 || psql -c "CREATE DATABASE ${dbName}"`,
                        // eslint-disable-next-line stylistic/max-len
                        `psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${dbUser}'" | grep -q 1 || psql -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'"`,
                        `psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}"`
                    ]
                );
                break;
            }
            case DbType.MARIADB: {
                await FsUtilities.createFile(
                    initFileSql,
                    [
                        `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`,
                        '',
                        `CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`,
                        `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';`,
                        '',
                        'FLUSH PRIVILEGES;'
                    ]
                );

            }
        }
    }

    private static async getInitConfigsForDb(db: string): Promise<DbInitConfig[]> {
        const dbFolder: Dirent[] = await FsUtilities.readdir(getPath(DATABASES_DIRECTORY_NAME, toKebabCase(db)));
        const configFilePaths: string[] = dbFolder.filter(e => e.name.endsWith('.json')).map(e => getPath(e.parentPath, e.name));
        return await Promise.all(configFilePaths.map(async p => await FsUtilities.parseFileAs(p)));
    }

    /**
     * Configures a db.
     * Prompts the user for selecting an existing one or creates a new.
     * @param projectName - The name of the project to configure this database for.
     * @param dbType - The type of database to configure. If omitted, the user is prompted for input.
     * @returns The name of the database service.
     */
    static async configureDb(projectName: string, dbType?: DbType): Promise<DbConfig> {
        const baseDbQuestions: QuestionsFor<DbConfig> = {
            dbServiceName: {
                type: 'select',
                message: 'Compose service',
                choices: ['NEW', ...(await this.getAvailableDatabases()).map(db => db.name)],
                default: 'NEW'
            },
            databaseName: {
                type: 'input',
                message: 'Database name',
                default: projectName
            }
        };
        const baseDbConfig: DbConfig = await InquirerUtilities.prompt(baseDbQuestions);

        if (baseDbConfig.dbServiceName !== 'NEW') {
            await this.addDbInitConfig(baseDbConfig.dbServiceName, {
                type: await this.getDbTypeForService(baseDbConfig.dbServiceName),
                nameEnvVariable: DefaultEnvKeys.dbName(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                userEnvVariable: DefaultEnvKeys.dbUser(baseDbConfig.dbServiceName, baseDbConfig.databaseName)
            });
            return baseDbConfig;
        }

        dbType = dbType ?? (await InquirerUtilities.prompt(dbTypeQuestion)).type;
        switch (dbType) {
            case DbType.POSTGRES: {
                const dbConfig: PostgresDbConfig = {
                    ...await InquirerUtilities.prompt(postgresDbConfigQuestions),
                    databaseName: baseDbConfig.databaseName,
                    type: dbType
                };
                await this.createPostgresDatabase(dbConfig.dbServiceName, dbConfig.databaseName);
                await this.addDbInitConfig(dbConfig.dbServiceName, {
                    type: dbConfig.type,
                    nameEnvVariable: DefaultEnvKeys.dbName(dbConfig.dbServiceName, dbConfig.databaseName),
                    passwordEnvVariable: DefaultEnvKeys.dbPassword(dbConfig.dbServiceName, dbConfig.databaseName),
                    userEnvVariable: DefaultEnvKeys.dbUser(dbConfig.dbServiceName, dbConfig.databaseName)
                });
                return dbConfig;
            }
            case DbType.MARIADB: {
                const dbConfig: MariaDbConfig = {
                    ...await InquirerUtilities.prompt(mariaDbConfigQuestions),
                    databaseName: baseDbConfig.databaseName,
                    type: dbType
                };
                await this.createMariaDbDatabase(dbConfig.dbServiceName, dbConfig.databaseName);
                await this.addDbInitConfig(dbConfig.dbServiceName, {
                    type: dbConfig.type,
                    nameEnvVariable: DefaultEnvKeys.dbName(dbConfig.dbServiceName, dbConfig.databaseName),
                    passwordEnvVariable: DefaultEnvKeys.dbPassword(dbConfig.dbServiceName, dbConfig.databaseName),
                    userEnvVariable: DefaultEnvKeys.dbUser(dbConfig.dbServiceName, dbConfig.databaseName)
                });
                return dbConfig;
            }
        }
    }

    private static async getDbTypeForService(serviceName: string): Promise<DbType> {
        const foundServices: ComposeService[] = (await DbUtilities.getAvailableDatabases()).filter(s => s.name === serviceName);
        if (!foundServices.length) {
            throw new Error(`Could not determine db type for service "${serviceName}": Not Found.`);
        }
        if (!this.isDatabaseService(foundServices[0])) {
            throw new Error(`Could not determine db type for service "${serviceName}": Not a database.`);
        }
        const image: string = foundServices[0].image as string;
        if (image.startsWith(DbType.POSTGRES)) {
            return DbType.POSTGRES;
        }
        if (image.startsWith(DbType.MARIADB)) {
            return DbType.MARIADB;
        }
        throw new Error(`Could not determine db type for service "${serviceName}": Unknown image: ${image}`);
    }

    private static async addDbInitConfig(dbComposeServiceName: string, data: DbInitConfig): Promise<void> {
        const dbFolder: string = getPath(DATABASES_DIRECTORY_NAME, toKebabCase(dbComposeServiceName));
        await FsUtilities.mkdir(getPath(dbFolder, 'init'));

        let created: boolean = false;
        let i: number = 0;
        while (!created) {
            const configFile: string = getPath(dbFolder, `${i}.json`);
            if (await FsUtilities.exists(configFile)) {
                i++;
                continue;
            }
            await FsUtilities.createFile(configFile, JsonUtilities.stringify(data));
            created = true;
        }
    }

    private static async getAvailableDatabases(): Promise<ComposeService[]> {
        const services: ComposeService[] = await DockerUtilities.getComposeServices();
        return services.filter(s => this.isDatabaseService(s));
    }

    private static async createMariaDbDatabase(dbServiceName: string, databaseName: string): Promise<void> {
        const PASSWORD_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbPassword(dbServiceName, databaseName);
        const USER_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbUser(dbServiceName, databaseName);
        const DATABASE_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbName(dbServiceName, databaseName);
        const HOST_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbHost(dbServiceName);
        const ROOT_PASSWORD_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbRootPassword(dbServiceName);

        const user: string = `${toSnakeCase(databaseName)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name: dbServiceName,
            image: `mariadb:${this.MARIADB_VERSION}`,
            volumes: [
                {
                    path: `${toKebabCase(dbServiceName)}-data`,
                    mount: '/var/lib/mysql'
                },
                {
                    path: `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(dbServiceName)}/init`,
                    mount: '/docker-entrypoint-initdb.d'
                }
            ],
            environment: [
                {
                    key: 'MARIADB_ROOT_PASSWORD',
                    value: `\${${ROOT_PASSWORD_ENV_VARIABLE}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(serviceDefinition, 3306, false, undefined);
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(dbServiceName)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 3306, internal: 3306 }]
            },
            3306,
            false,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(dbServiceName)}-data`, DEV_DOCKER_COMPOSE_FILE_NAME);
        await EnvUtilities.addStaticVariable({
            key: PASSWORD_ENV_VARIABLE,
            value: password,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: USER_ENV_VARIABLE,
            value: user,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DATABASE_ENV_VARIABLE,
            value: databaseName,
            required: true,
            type: 'string'
        });
        // TODO: make calculated variable either "localhost" for dev or "serviceName" for local/prod.
        await EnvUtilities.addStaticVariable({
            key: HOST_ENV_VARIABLE,
            value: 'localhost',
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: ROOT_PASSWORD_ENV_VARIABLE,
            value: rootPassword,
            required: true,
            type: 'string'
        });
    }

    private static async createPostgresDatabase(dbServiceName: string, databaseName: string): Promise<void> {
        const PASSWORD_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbPassword(dbServiceName, databaseName);
        const USER_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbUser(dbServiceName, databaseName);
        const DATABASE_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbName(dbServiceName, databaseName);
        const HOST_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbHost(dbServiceName);
        const ROOT_PASSWORD_ENV_VARIABLE: EnvironmentVariableKey = DefaultEnvKeys.dbRootPassword(dbServiceName);

        const user: string = `${toSnakeCase(databaseName)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name: dbServiceName,
            image: `postgres:${this.POSTGRES_VERSION}`,
            volumes: [
                {
                    path: `${toKebabCase(dbServiceName)}-data`,
                    mount: '/var/lib/postgresql/data'
                },
                {
                    path: `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(dbServiceName)}/init`,
                    mount: '/docker-entrypoint-initdb.d'
                }
            ],
            environment: [
                {
                    key: 'POSTGRES_PASSWORD',
                    value: `\${${ROOT_PASSWORD_ENV_VARIABLE}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(serviceDefinition, 5432, false);
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(dbServiceName)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 5432, internal: 5432 }]
            },
            5432,
            false,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(dbServiceName)}-data`, DEV_DOCKER_COMPOSE_FILE_NAME);
        await EnvUtilities.addStaticVariable({
            key: PASSWORD_ENV_VARIABLE,
            value: password,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: USER_ENV_VARIABLE,
            value: user,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DATABASE_ENV_VARIABLE,
            value: databaseName,
            required: true,
            type: 'string'
        });
        // TODO: make calculated variable either "localhost" for dev or "serviceName" for local/prod.
        await EnvUtilities.addStaticVariable({
            key: HOST_ENV_VARIABLE,
            value: 'localhost',
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: ROOT_PASSWORD_ENV_VARIABLE,
            value: rootPassword,
            required: true,
            type: 'string'
        });
    }

    private static isDatabaseService(service: ComposeService): boolean {
        if (!service.image) {
            return false;
        }
        return !(Object.values(DbType).find(t => !!service.image && service.image.startsWith(t)) == undefined);
    }
}