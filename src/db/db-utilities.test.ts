import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { DbType } from './db-type.enum';
import { DbUtilities } from './db.utilities';
import { DATABASES_DIRECTORY_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { getPath } from '../utilities';

const mockConstants: MockConstants = getMockConstants('db-utilities');

describe('DbUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(
            mockConstants,
            ['DOCKER_COMPOSE_YAML', 'DEV_DOCKER_COMPOSE_YAML', 'LOCAL_DOCKER_COMPOSE_YAML', 'ENV', 'GLOBAL_ENV_MODEL']
        );
    });

    test('createPostgresDatabase', async () => {
        const DB_SERVICE_NAME: string = 'postgresDb';
        const DATABASE_NAME: string = 'test';

        await DbUtilities['createPostgresDatabase'](DB_SERVICE_NAME, DATABASE_NAME);
        await DbUtilities['addDbInitConfig'](
            DB_SERVICE_NAME,
            {
                type: DbType.POSTGRES,
                nameEnvVariable: DefaultEnvKeys.dbName(DB_SERVICE_NAME, DATABASE_NAME),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(DB_SERVICE_NAME, DATABASE_NAME),
                userEnvVariable: DefaultEnvKeys.dbUser(DB_SERVICE_NAME, DATABASE_NAME)
            }
        );
        const dockerComposeContent: string[] = await FsUtilities.readFileLines(mockConstants.DOCKER_COMPOSE_YAML);
        const devDockerComposeContent: string[] = await FsUtilities.readFileLines(mockConstants.DEV_DOCKER_COMPOSE_YAML);
        const initConfig: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'postgres-db', '0.json'));

        expect(dockerComposeContent).toEqual([
            'services:',
            '',
            '    postgresDb:',
            '        image: postgres:16',
            '        restart: unless-stopped',
            '        volumes:',
            '            - postgres-db-data:/var/lib/postgresql/data',
            '            - ./databases/postgres-db/init:/docker-entrypoint-initdb.d',
            '        environment:',
            '            POSTGRES_PASSWORD: \${postgres_db_db_root_password}',
            '',
            'volumes:',
            '    postgres-db-data:'
        ]);
        expect(devDockerComposeContent).toEqual([
            'services:',
            '',
            '    postgresDb:',
            '        image: postgres:16',
            '        restart: unless-stopped',
            '        ports:',
            '            - 5432:5432',
            '        volumes:',
            '            - postgres-db-data:/var/lib/postgresql/data',
            '            - ./databases/postgres-db/init:/docker-entrypoint-initdb.d',
            '        environment:',
            '            POSTGRES_PASSWORD: \${postgres_db_db_root_password}',
            '',
            'volumes:',
            '    postgres-db-data:'
        ]);
        expect(initConfig).toEqual([
            '{',
            '    "type": "postgres",',
            '    "nameEnvVariable": "postgres_db_test_database",',
            '    "passwordEnvVariable": "postgres_db_test_db_password",',
            '    "userEnvVariable": "postgres_db_test_db_user"',
            '}'
        ]);
    });

    test('createMariaDbDatabase', async () => {
        const DB_SERVICE_NAME: string = 'mariaDb';
        const DATABASE_NAME: string = 'test';

        await DbUtilities['createMariaDbDatabase'](DB_SERVICE_NAME, DATABASE_NAME);
        await DbUtilities['addDbInitConfig'](
            DB_SERVICE_NAME,
            {
                type: DbType.MARIADB,
                nameEnvVariable: DefaultEnvKeys.dbName(DB_SERVICE_NAME, DATABASE_NAME),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(DB_SERVICE_NAME, DATABASE_NAME),
                userEnvVariable: DefaultEnvKeys.dbUser(DB_SERVICE_NAME, DATABASE_NAME)
            }
        );

        const dockerComposeContent: string[] = await FsUtilities.readFileLines(mockConstants.DOCKER_COMPOSE_YAML);
        const devDockerComposeContent: string[] = await FsUtilities.readFileLines(mockConstants.DEV_DOCKER_COMPOSE_YAML);
        const initConfig: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'maria-db', '0.json'));

        expect(dockerComposeContent).toEqual([
            'services:',
            '',
            '    mariaDb:',
            '        image: mariadb:11',
            '        restart: unless-stopped',
            '        volumes:',
            '            - maria-db-data:/var/lib/mysql',
            '            - ./databases/maria-db/init:/docker-entrypoint-initdb.d',
            '        environment:',
            '            MARIADB_ROOT_PASSWORD: \${maria_db_db_root_password}',
            '',
            'volumes:',
            '    maria-db-data:'
        ]);
        expect(devDockerComposeContent).toEqual([
            'services:',
            '',
            '    mariaDb:',
            '        image: mariadb:11',
            '        restart: unless-stopped',
            '        ports:',
            '            - 3306:3306',
            '        volumes:',
            '            - maria-db-data:/var/lib/mysql',
            '            - ./databases/maria-db/init:/docker-entrypoint-initdb.d',
            '        environment:',
            '            MARIADB_ROOT_PASSWORD: \${maria_db_db_root_password}',
            '',
            'volumes:',
            '    maria-db-data:'
        ]);
        expect(initConfig).toEqual([
            '{',
            '    "type": "mariadb",',
            '    "nameEnvVariable": "maria_db_test_database",',
            '    "passwordEnvVariable": "maria_db_test_db_password",',
            '    "userEnvVariable": "maria_db_test_db_user"',
            '}'
        ]);
    });

    test('createInitFiles', async () => {
        const MARIADB_SERVICE_NAME: string = 'mariaDb';
        const MARIADB_DATABASE_NAME: string = 'test';

        const POSTGRES_SERVICE_NAME: string = 'postgresDb';
        const POSTGRES_DATABASE_NAME: string = 'test2';

        await DbUtilities['createMariaDbDatabase'](MARIADB_SERVICE_NAME, MARIADB_DATABASE_NAME);
        await DbUtilities['addDbInitConfig'](
            MARIADB_SERVICE_NAME,
            {
                type: DbType.MARIADB,
                nameEnvVariable: DefaultEnvKeys.dbName(MARIADB_SERVICE_NAME, MARIADB_DATABASE_NAME),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(MARIADB_SERVICE_NAME, MARIADB_DATABASE_NAME),
                userEnvVariable: DefaultEnvKeys.dbUser(MARIADB_SERVICE_NAME, MARIADB_DATABASE_NAME)
            }
        );
        await DbUtilities['createPostgresDatabase'](POSTGRES_SERVICE_NAME, POSTGRES_DATABASE_NAME);
        await DbUtilities['addDbInitConfig'](
            POSTGRES_SERVICE_NAME,
            {
                type: DbType.POSTGRES,
                nameEnvVariable: DefaultEnvKeys.dbName(POSTGRES_SERVICE_NAME, POSTGRES_DATABASE_NAME),
                passwordEnvVariable: DefaultEnvKeys.dbPassword(POSTGRES_SERVICE_NAME, POSTGRES_DATABASE_NAME),
                userEnvVariable: DefaultEnvKeys.dbUser(POSTGRES_SERVICE_NAME, POSTGRES_DATABASE_NAME)
            }
        );

        await DbUtilities.createInitFiles('dev.docker-compose.yaml');

        const initShContent: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'postgres-db', 'init', '0.sh'));
        const postgresPassword: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.dbPassword(POSTGRES_SERVICE_NAME, POSTGRES_DATABASE_NAME), 'dev.docker-compose.yaml');
        const initSqlContent: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'maria-db', 'init', '0.sql'));
        const mariadbPassword: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.dbPassword(MARIADB_SERVICE_NAME, MARIADB_DATABASE_NAME), 'dev.docker-compose.yaml');

        expect(initShContent).toEqual([
            '#!/bin/bash',
            'psql -tc "SELECT 1 FROM pg_database WHERE datname = \'test2\'" | grep -q 1 || psql -c "CREATE DATABASE test2"',
            `psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'test2_user'" | grep -q 1 || psql -c "CREATE USER test2_user WITH PASSWORD '${postgresPassword}'"`,
            'psql -c "GRANT ALL PRIVILEGES ON DATABASE test2 TO test2_user"'
        ]);
        expect(initSqlContent).toEqual([
            'CREATE DATABASE IF NOT EXISTS `test`;',
            '',
            `CREATE USER IF NOT EXISTS 'test_user'@'%' IDENTIFIED BY '${mariadbPassword}';`,
            'GRANT ALL PRIVILEGES ON `test`.* TO \'test_user\'@\'%\';',
            '',
            'FLUSH PRIVILEGES;'
        ]);
    });
});