import { beforeEach, describe, expect, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { DbType } from './db-type.enum';
import { DbUtilities } from './db.utilities';
import { DATABASES_DIRECTORY_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { EnvUtilities } from '../env';
import { getPath, toSnakeCase } from '../utilities';

const mockConstants: MockConstants = getMockConstants('db-utilities');

describe('DbUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(
            mockConstants,
            ['DOCKER_COMPOSE_YAML', 'DEV_DOCKER_COMPOSE_YAML', 'LOCAL_DOCKER_COMPOSE_YAML', 'ENV', 'GLOBAL_ENV_MODEL']
        );
    });

    test('createPostgresDatabase', async () => {
        await DbUtilities['createPostgresDatabase']('postgresDb', 'test', mockConstants.PROJECT_DIR);
        await DbUtilities['addDbInitConfig'](
            'postgresDb',
            {
                type: DbType.POSTGRES,
                nameEnvVariable: `${toSnakeCase('test')}_database`,
                passwordEnvVariable: `${toSnakeCase('test')}_db_password`,
                userEnvVariable: `${toSnakeCase('test')}_db_user`
            },
            mockConstants.PROJECT_DIR
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
            '            POSTGRES_PASSWORD: \${postgres_db_root_password}',
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
            '            POSTGRES_PASSWORD: \${postgres_db_root_password}',
            '',
            'volumes:',
            '    postgres-db-data:'
        ]);
        expect(initConfig).toEqual([
            '{',
            '    "type": "postgres",',
            '    "nameEnvVariable": "test_database",',
            '    "passwordEnvVariable": "test_db_password",',
            '    "userEnvVariable": "test_db_user"',
            '}'
        ]);
    });

    test('createMariaDbDatabase', async () => {
        await DbUtilities['createMariaDbDatabase']('mariaDb', 'test', mockConstants.PROJECT_DIR);
        await DbUtilities['addDbInitConfig'](
            'mariaDb',
            {
                type: DbType.MARIADB,
                nameEnvVariable: `${toSnakeCase('test')}_database`,
                passwordEnvVariable: `${toSnakeCase('test')}_db_password`,
                userEnvVariable: `${toSnakeCase('test')}_db_user`
            },
            mockConstants.PROJECT_DIR
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
            '            MARIADB_ROOT_PASSWORD: \${maria_db_root_password}',
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
            '            MARIADB_ROOT_PASSWORD: \${maria_db_root_password}',
            '',
            'volumes:',
            '    maria-db-data:'
        ]);
        expect(initConfig).toEqual([
            '{',
            '    "type": "mariadb",',
            '    "nameEnvVariable": "test_database",',
            '    "passwordEnvVariable": "test_db_password",',
            '    "userEnvVariable": "test_db_user"',
            '}'
        ]);
    });

    test('createInitFiles', async () => {
        await DbUtilities['createMariaDbDatabase']('mariaDb', 'test', mockConstants.PROJECT_DIR);
        await DbUtilities['addDbInitConfig'](
            'mariaDb',
            {
                type: DbType.MARIADB,
                nameEnvVariable: `${toSnakeCase('test')}_database`,
                passwordEnvVariable: `${toSnakeCase('test')}_db_password`,
                userEnvVariable: `${toSnakeCase('test')}_db_user`
            },
            mockConstants.PROJECT_DIR
        );
        await DbUtilities['createPostgresDatabase']('postgresDb', 'test2', mockConstants.PROJECT_DIR);
        await DbUtilities['addDbInitConfig'](
            'postgresDb',
            {
                type: DbType.POSTGRES,
                nameEnvVariable: `${toSnakeCase('test2')}_database`,
                passwordEnvVariable: `${toSnakeCase('test2')}_db_password`,
                userEnvVariable: `${toSnakeCase('test2')}_db_user`
            },
            mockConstants.PROJECT_DIR
        );

        await DbUtilities.createInitFiles(mockConstants.PROJECT_DIR);

        const initShContent: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'postgres-db', 'init', '0.sh'));
        const postgresPassword: string = await EnvUtilities.getEnvVariable(`${toSnakeCase('test2')}_db_password`, mockConstants.PROJECT_DIR);
        const initSqlContent: string[] = await FsUtilities.readFileLines(getPath(mockConstants.PROJECT_DIR, DATABASES_DIRECTORY_NAME, 'maria-db', 'init', '0.sql'));
        const mariadbPassword: string = await EnvUtilities.getEnvVariable(`${toSnakeCase('test')}_db_password`, mockConstants.PROJECT_DIR);

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