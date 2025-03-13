import { Dirent } from 'fs';

import { DATABASES_DIRECTORY_NAME, DEV_DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { ComposeService, DockerUtilities } from '../docker';
import { FsUtilities, InquirerUtilities, JsonUtilities, QuestionsFor } from '../encapsulation';
import { EnvUtilities } from '../env';
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
     * The database to be used by the api.
     */
    database: Omit<string, 'NEW'> | 'NEW'
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
    nameEnvVariable: string,
    /**
     * The variable key for the database user.
     */
    userEnvVariable: string,
    /**
     * The variable key for the database users password.
     */
    passwordEnvVariable: string
};

/**
 * Utilities for handling databases.
 */
export abstract class DbUtilities {

    private static readonly POSTGRES_VERSION: number = 16;

    private static readonly MARIADB_VERSION: number = 11;

    /**
     * Creates the bash init files for setting up default databases and users.
     * @param rootPath - The path to the root of the monorepo. Defaults to ''.
     */
    static async createInitFiles(rootPath: string = ''): Promise<void> {
        const dbs: ComposeService[] = await this.getAvailableDatabases(rootPath);
        for (const db of dbs) {
            const configs: DbInitConfig[] = await this.getInitConfigsForDb(db.name, rootPath);
            for (let i: number = 0; i < configs.length; i++) {
                const initFileSh: string = getPath(rootPath, DATABASES_DIRECTORY_NAME, toKebabCase(db.name), 'init', `${i}.sh`);
                const initFileSql: string = getPath(rootPath, DATABASES_DIRECTORY_NAME, toKebabCase(db.name), 'init', `${i}.sql`);
                await FsUtilities.rm(initFileSh);
                await FsUtilities.rm(initFileSql);
                await this.createInitFile(configs[i], initFileSh, initFileSql, rootPath);
            }
        }
    }

    private static async createInitFile(config: DbInitConfig, initFileSh: string, initFileSql: string, rootPath: string): Promise<void> {
        const dbName: string = await EnvUtilities.getEnvVariable(config.nameEnvVariable, rootPath);
        const dbUser: string = await EnvUtilities.getEnvVariable(config.userEnvVariable, rootPath);
        const dbPassword: string = await EnvUtilities.getEnvVariable(config.passwordEnvVariable, rootPath);

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

    private static async getInitConfigsForDb(db: string, rootPath: string): Promise<DbInitConfig[]> {
        const dbFolder: Dirent[] = await FsUtilities.readdir(getPath(rootPath, DATABASES_DIRECTORY_NAME, toKebabCase(db)));
        const configFilePaths: string[] = dbFolder.filter(e => e.name.endsWith('.json')).map(e => getPath(e.parentPath, e.name));
        return await Promise.all(configFilePaths.map(async p => await FsUtilities.parseFileAs(p)));
    }

    /**
     * Configures a db.
     * Prompts the user for selecting an existing one or creates a new.
     * @param dbName - The name of the database to configure.
     * @param dbType - The type of database to configure. If omitted, the user is prompted for input.
     * @param rootPath - The path to the root of the monorepo. Defaults to ''.
     * @returns The name of the database.
     */
    static async configureDb(dbName: string, dbType?: DbType, rootPath: string = ''): Promise<string> {
        const selectDbQuestions: QuestionsFor<DbConfig> = {
            database: {
                type: 'select',
                message: 'Database',
                choices: ['NEW', ...(await this.getAvailableDatabases(rootPath)).map(db => db.name)],
                default: 'NEW'
            }
        };
        const db: Omit<string, 'NEW'> | 'NEW' = (await InquirerUtilities.prompt(selectDbQuestions)).database;
        if (db === 'NEW') {
            dbType = dbType ?? (await InquirerUtilities.prompt(dbTypeQuestion)).type;
            switch (dbType) {
                case DbType.POSTGRES: {
                    const dbConfig: PostgresDbConfig = {
                        ...await InquirerUtilities.prompt(postgresDbConfigQuestions),
                        type: dbType
                    };
                    await this.createPostgresDatabase(dbConfig.name, dbConfig.database, rootPath);
                    await this.addDbInitConfig(dbConfig.name, {
                        type: dbConfig.type,
                        nameEnvVariable: `${toSnakeCase(dbName)}_database`,
                        passwordEnvVariable: `${toSnakeCase(dbName)}_db_password`,
                        userEnvVariable: `${toSnakeCase(dbName)}_db_user`
                    }, rootPath);
                    return dbConfig.name;
                }
                case DbType.MARIADB: {
                    const dbConfig: MariaDbConfig = {
                        ...await InquirerUtilities.prompt(mariaDbConfigQuestions),
                        type: dbType
                    };
                    await this.createMariaDbDatabase(dbConfig.name, dbConfig.database, rootPath);
                    await this.addDbInitConfig(dbConfig.name, {
                        type: dbConfig.type,
                        nameEnvVariable: `${toSnakeCase(dbName)}_database`,
                        passwordEnvVariable: `${toSnakeCase(dbName)}_db_password`,
                        userEnvVariable: `${toSnakeCase(dbName)}_db_user`
                    }, rootPath);
                    return dbConfig.name;
                }
            }
        }
        await this.addDbInitConfig(db as string, {
            type: await this.getDbTypeForService(db as string, rootPath),
            nameEnvVariable: `${toSnakeCase(dbName)}_database`,
            passwordEnvVariable: `${toSnakeCase(dbName)}_db_password`,
            userEnvVariable: `${toSnakeCase(dbName)}_db_user`
        }, rootPath);
        return db as string;
    }

    private static async getDbTypeForService(serviceName: string, rootPath: string): Promise<DbType> {
        const foundServices: ComposeService[] = (await DbUtilities.getAvailableDatabases(rootPath)).filter(s => s.name === serviceName);
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

    private static async addDbInitConfig(dbComposeServiceName: string, data: DbInitConfig, rootPath: string): Promise<void> {
        const dbFolder: string = getPath(rootPath, DATABASES_DIRECTORY_NAME, toKebabCase(dbComposeServiceName));
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

    private static async getAvailableDatabases(rootPath: string): Promise<ComposeService[]> {
        const services: ComposeService[] = await DockerUtilities.getComposeServices(rootPath);
        return services.filter(s => this.isDatabaseService(s));
    }

    private static async createMariaDbDatabase(name: string, database: string, rootPath: string): Promise<void> {
        const PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(database)}_db_password`;
        const USER_ENV_VARIABLE: string = `${toSnakeCase(database)}_db_user`;
        const DATABASE_ENV_VARIABLE: string = `${toSnakeCase(database)}_database`;
        const HOST_ENV_VARIABLE: string = `${toSnakeCase(name)}_host`;
        const ROOT_PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(name)}_root_password`;

        const user: string = `${toSnakeCase(database)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name,
            image: `mariadb:${this.MARIADB_VERSION}`,
            volumes: [
                {
                    path: `${toKebabCase(name)}-data`,
                    mount: '/var/lib/mysql'
                },
                {
                    path: `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(name)}/init`,
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
        await DockerUtilities.addServiceToCompose(serviceDefinition, undefined, undefined, rootPath);
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`, rootPath);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 3306, internal: 3306 }]
            },
            undefined,
            undefined,
            rootPath,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`, rootPath, DEV_DOCKER_COMPOSE_FILE_NAME);
        await EnvUtilities.addVariable({
            key: PASSWORD_ENV_VARIABLE,
            value: password,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: USER_ENV_VARIABLE,
            value: user,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: DATABASE_ENV_VARIABLE,
            value: database,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: HOST_ENV_VARIABLE,
            value: 'localhost',
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: ROOT_PASSWORD_ENV_VARIABLE,
            value: rootPassword,
            required: true,
            type: 'string'
        }, rootPath);
    }

    private static async createPostgresDatabase(name: string, database: string, rootPath: string): Promise<void> {
        const PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(database)}_db_password`;
        const USER_ENV_VARIABLE: string = `${toSnakeCase(database)}_db_user`;
        const DATABASE_ENV_VARIABLE: string = `${toSnakeCase(database)}_database`;
        const HOST_ENV_VARIABLE: string = `${toSnakeCase(name)}_host`;
        const ROOT_PASSWORD_ENV_VARIABLE: string = `${toSnakeCase(name)}_root_password`;

        const user: string = `${toSnakeCase(database)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name,
            image: `postgres:${this.POSTGRES_VERSION}`,
            volumes: [
                {
                    path: `${toKebabCase(name)}-data`,
                    mount: '/var/lib/postgresql/data'
                },
                {
                    path: `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(name)}/init`,
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
        await DockerUtilities.addServiceToCompose(serviceDefinition, undefined, undefined, rootPath);
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`, rootPath);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 5432, internal: 5432 }]
            },
            undefined,
            undefined,
            rootPath,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await DockerUtilities.addVolumeToCompose(`${toKebabCase(name)}-data`, rootPath, DEV_DOCKER_COMPOSE_FILE_NAME);
        await EnvUtilities.addVariable({
            key: PASSWORD_ENV_VARIABLE,
            value: password,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: USER_ENV_VARIABLE,
            value: user,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: DATABASE_ENV_VARIABLE,
            value: database,
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: HOST_ENV_VARIABLE,
            value: 'localhost',
            required: true,
            type: 'string'
        }, rootPath);
        await EnvUtilities.addVariable({
            key: ROOT_PASSWORD_ENV_VARIABLE,
            value: rootPassword,
            required: true,
            type: 'string'
        }, rootPath);
    }

    private static isDatabaseService(service: ComposeService): boolean {
        if (!service.image) {
            return false;
        }
        return !(Object.values(DbType).find(t => service.image?.startsWith(t)) == undefined);
    }
}