import { Dirent } from 'fs';

import { DATABASES_DIRECTORY_NAME, DEV_DOCKER_COMPOSE_FILE_NAME, DockerComposeFileName, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME } from '../constants';
import { ComposeService, DockerUtilities } from '../docker';
import { FsUtilities, InquirerUtilities, JsonUtilities, QuestionsFor } from '../encapsulation';
import { DefaultEnvKeys, EnvironmentVariableKey, EnvUtilities } from '../env';
import { generatePlaceholderPassword, getPath, Path, toKebabCase, toSnakeCase } from '../utilities';
import { DbType } from './db-type.enum';
import { dbTypeQuestion } from './db-type.question';
import { MariaDbConfig, mariaDbConfigQuestions } from './maria-db.questions';
import { PostgresDbConfig, postgresDbConfigQuestions } from './postgres-db.questions';
import { OmitStrict } from '../types';

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
    databaseName: string,
    /**
     * The type of the database.
     */
    dbType: DbType
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
     * @param rootDir - The directory of the Monux monorepo.
     */
    static async createInitFiles(fileName: DockerComposeFileName, rootDir: string): Promise<void> {
        const dbs: ComposeService[] = await this.getAvailableDatabases(rootDir);
        for (const db of dbs) {
            const configs: DbInitConfig[] = await this.getInitConfigsForDb(db.name, rootDir);
            for (let i: number = 0; i < configs.length; i++) {
                const initFileSql: Path = getPath(rootDir, DATABASES_DIRECTORY_NAME, toKebabCase(db.name), 'init', `${i}.sql`);
                await FsUtilities.rm(initFileSql);
                await this.createInitFile(configs[i], initFileSql, fileName, rootDir);
            }
        }
    }

    private static async createInitFile(
        config: DbInitConfig,
        initFileSql: Path,
        fileName: DockerComposeFileName,
        rootDir: string
    ): Promise<void> {
        const dbName: string = await EnvUtilities.getEnvVariable(config.nameEnvVariable, fileName, rootDir);
        const dbUser: string = await EnvUtilities.getEnvVariable(config.userEnvVariable, fileName, rootDir);
        const dbPassword: string = await EnvUtilities.getEnvVariable(config.passwordEnvVariable, fileName, rootDir);

        switch (config.type) {
            case DbType.POSTGRES: {
                await FsUtilities.createFile(
                    initFileSql,
                    [
                        '-- 1) Create DB if missing',
                        `SELECT format('CREATE DATABASE %I', '${dbName}')`,
                        `    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}')\\gexec`,
                        '',
                        '-- 2) Create user if missing',
                        'SELECT format(',
                        '    \'CREATE USER %I WITH PASSWORD %L\',',
                        `    '${dbUser}',`,
                        `    '${dbPassword}'`,
                        ')',
                        `    WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${dbUser}')\\gexec`,
                        '',
                        '-- 3) Grant privileges',
                        `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}";`,
                        `\\connect ${dbName}`,
                        `GRANT ALL PRIVILEGES ON SCHEMA public TO ${dbUser};`
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

    private static async getInitConfigsForDb(db: string, rootDir: string): Promise<DbInitConfig[]> {
        const dbFolder: Dirent[] = await FsUtilities.readdir(getPath(rootDir, DATABASES_DIRECTORY_NAME, toKebabCase(db)));
        const configFilePaths: Path[] = dbFolder.filter(e => e.name.endsWith('.json')).map(e => getPath(e.parentPath, e.name));
        return await Promise.all(configFilePaths.map(async p => await FsUtilities.parseFileAs(p)));
    }

    /**
     * Configures a db.
     * Prompts the user for selecting an existing one or creates a new.
     * @param projectName - The name of the project to configure this database for.
     * @param dbType - The type of database to configure. If omitted, the user is prompted for input.
     * @param rootDir - The directory of the Monux monorepo.
     * @returns The name of the database service.
     */
    static async configureDb(projectName: string, dbType: DbType | undefined, rootDir: string): Promise<DbConfig> {
        const baseDbQuestions: QuestionsFor<OmitStrict<DbConfig, 'dbType'>> = {
            dbServiceName: {
                type: 'select',
                message: 'Database compose service',
                choices: ['NEW', ...(await this.getAvailableDatabases(rootDir)).map(db => db.name)],
                default: 'NEW'
            },
            databaseName: {
                type: 'input',
                message: 'Database name',
                default: projectName
            }
        };
        const baseDbConfig: OmitStrict<DbConfig, 'dbType'> = await InquirerUtilities.prompt(baseDbQuestions);

        if (baseDbConfig.dbServiceName !== 'NEW') {
            const type: DbType = await this.getDbTypeForService(baseDbConfig.dbServiceName, rootDir);
            const user: string = `${toSnakeCase(baseDbConfig.databaseName)}_user`;
            const password: string = generatePlaceholderPassword();
            await EnvUtilities.addStaticVariable({
                key: DefaultEnvKeys.dbPassword(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                value: password,
                required: true,
                type: 'string'
            });
            await EnvUtilities.addStaticVariable({
                key: DefaultEnvKeys.dbUser(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                value: user,
                required: true,
                type: 'string'
            });
            await EnvUtilities.addStaticVariable({
                key: DefaultEnvKeys.dbName(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                value: baseDbConfig.databaseName,
                required: true,
                type: 'string'
            });
            await this.addDbInitConfig(baseDbConfig.dbServiceName, {
                type,
                nameEnvVariable: DefaultEnvKeys.dbName(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(baseDbConfig.dbServiceName, baseDbConfig.databaseName),
                userEnvVariable: DefaultEnvKeys.dbUser(baseDbConfig.dbServiceName, baseDbConfig.databaseName)
            });
            return { ...baseDbConfig, dbType: type };
        }

        dbType = dbType ?? (await InquirerUtilities.prompt(dbTypeQuestion)).type;
        switch (dbType) {
            case DbType.POSTGRES: {
                const dbConfig: PostgresDbConfig = {
                    ...await InquirerUtilities.prompt(postgresDbConfigQuestions),
                    databaseName: baseDbConfig.databaseName,
                    dbType: dbType
                };
                await this.createPostgresDatabase(dbConfig.dbServiceName, dbConfig.databaseName);
                await this.addDbInitConfig(dbConfig.dbServiceName, {
                    type: dbConfig.dbType,
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
                    dbType: dbType
                };
                await this.createMariaDbDatabase(dbConfig.dbServiceName, dbConfig.databaseName);
                await this.addDbInitConfig(dbConfig.dbServiceName, {
                    type: dbConfig.dbType,
                    nameEnvVariable: DefaultEnvKeys.dbName(dbConfig.dbServiceName, dbConfig.databaseName),
                    passwordEnvVariable: DefaultEnvKeys.dbPassword(dbConfig.dbServiceName, dbConfig.databaseName),
                    userEnvVariable: DefaultEnvKeys.dbUser(dbConfig.dbServiceName, dbConfig.databaseName)
                });
                return dbConfig;
            }
        }
    }

    private static async getDbTypeForService(serviceName: string, rootDir: string): Promise<DbType> {
        const foundServices: ComposeService[] = (await this.getAvailableDatabases(rootDir)).filter(s => s.name === serviceName);
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
            const configFile: Path = getPath(dbFolder, `${i}.json`);
            if (await FsUtilities.exists(configFile)) {
                i++;
                continue;
            }
            await FsUtilities.createFile(configFile, JsonUtilities.stringify(data));
            created = true;
        }
    }

    private static async getAvailableDatabases(rootDir: string): Promise<ComposeService[]> {
        const services: ComposeService[] = await DockerUtilities.getComposeServices(rootDir);
        return services.filter(s => this.isDatabaseService(s));
    }

    private static async createMariaDbDatabase(dbServiceName: string, databaseName: string): Promise<void> {
        const user: string = `${toSnakeCase(databaseName)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name: dbServiceName,
            image: `mariadb:${this.MARIADB_VERSION}`,
            volumes: [
                `${toKebabCase(dbServiceName)}-data:/var/lib/mysql`,
                `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(dbServiceName)}/init:/docker-entrypoint-initdb.d`
            ],
            environment: [
                {
                    key: 'MARIADB_ROOT_PASSWORD',
                    value: `\${${DefaultEnvKeys.dbRootPassword(dbServiceName)}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(serviceDefinition, 3306, 3306, false, undefined);
        await DockerUtilities.addVolumeToComposeFiles(`${toKebabCase(dbServiceName)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 3306, internal: 3306 }]
            },
            3306,
            3306,
            false,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            value: password,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            value: user,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbName(dbServiceName, databaseName),
            value: databaseName,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbRootPassword(dbServiceName),
            value: rootPassword,
            required: true,
            type: 'string'
        });

        await EnvUtilities.addCalculatedVariable({
            key: DefaultEnvKeys.dbHost(dbServiceName),
            required: true,
            type: 'string',
            value: (env, fileName) => {
                switch (fileName) {
                    case 'dev.docker-compose.yaml': {
                        return 'localhost';
                    }
                    case 'docker-compose.yaml':
                    case 'local.docker-compose.yaml': {
                        return 'DB_SERVICE_NAME_PLACEHOLDER';
                    }
                }

            }
        });

        await FsUtilities.replaceInFile(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            'DB_SERVICE_NAME_PLACEHOLDER',
            dbServiceName
        );
    }

    private static async createPostgresDatabase(dbServiceName: string, databaseName: string): Promise<void> {
        const user: string = `${toSnakeCase(databaseName)}_user`;
        const password: string = generatePlaceholderPassword();
        const rootPassword: string = generatePlaceholderPassword();

        const serviceDefinition: ComposeService = {
            name: dbServiceName,
            image: `postgres:${this.POSTGRES_VERSION}`,
            volumes: [
                `${toKebabCase(dbServiceName)}-data:/var/lib/postgresql/data`,
                `./${DATABASES_DIRECTORY_NAME}/${toKebabCase(dbServiceName)}/init:/docker-entrypoint-initdb.d`
            ],
            environment: [
                {
                    key: 'POSTGRES_PASSWORD',
                    value: `\${${DefaultEnvKeys.dbRootPassword(dbServiceName)}}`
                }
            ]
        };
        await DockerUtilities.addServiceToCompose(serviceDefinition, 5432, 5432, false);
        await DockerUtilities.addVolumeToComposeFiles(`${toKebabCase(dbServiceName)}-data`);
        await DockerUtilities.addServiceToCompose(
            {
                ...serviceDefinition,
                ports: [{ external: 5432, internal: 5432 }]
            },
            5432,
            5432,
            false,
            undefined,
            DEV_DOCKER_COMPOSE_FILE_NAME
        );
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbPassword(dbServiceName, databaseName),
            value: password,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbUser(dbServiceName, databaseName),
            value: user,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbName(dbServiceName, databaseName),
            value: databaseName,
            required: true,
            type: 'string'
        });
        await EnvUtilities.addStaticVariable({
            key: DefaultEnvKeys.dbRootPassword(dbServiceName),
            value: rootPassword,
            required: true,
            type: 'string'
        });

        await EnvUtilities.addCalculatedVariable({
            key: DefaultEnvKeys.dbHost(dbServiceName),
            required: true,
            type: 'string',
            value: (env, fileName) => {
                switch (fileName) {
                    case 'dev.docker-compose.yaml': {
                        return 'localhost';
                    }
                    case 'docker-compose.yaml':
                    case 'local.docker-compose.yaml': {
                        return 'DB_SERVICE_NAME_PLACEHOLDER';
                    }
                }

            }
        });
        await FsUtilities.replaceInFile(
            getPath(GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
            'DB_SERVICE_NAME_PLACEHOLDER',
            dbServiceName
        );
    }

    private static isDatabaseService(service: ComposeService): boolean {
        if (!service.image) {
            return false;
        }
        return !(Object.values(DbType).find(t => !!service.image && service.image.startsWith(t)) == undefined);
    }
}