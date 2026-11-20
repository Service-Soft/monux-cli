import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, getMockConstants, inquireMock, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities, ServiceRequest, ServiceResponse } from '../../../__testing__';
import { DEV_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddWordpressCommand } from './add-wordpress.command';

const mockConstants: MockConstants = getMockConstants('add-wordpress-command');

// Wordpress in development, on port 80 of this machine
const HOME: ServiceRequest = { host: 'localhost', path: '/', port: 80 };

describe('AddWordpressCommand', () => {
    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'wordpress',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'wordpress',
            dbType: DbType.MARIADB
        }));
    });

    test('adds Wordpress, which installs with its database and keeps its content over a restart', async () => {
        const baseConfig: AddConfiguration = { name: 'wordpress', type: AddType.WORDPRESS };
        await new AddWordpressCommand(baseConfig).add();
        expect(await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML)).toContain('            - wordpress-data:/var/www/html');

        try {
            await RunningWorkspaceUtilities.up(DEV_DOCKER_COMPOSE_FILE_NAME);
            // the installation page, once Wordpress reaches its database
            const installation: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { ...HOME, path: '/wp-admin/install.php' },
                response => response.status === 200
            );
            expect(installation.body).toContain('WordPress');

            // installed the way a browser does it, and a file in the folder of its uploads
            await RunningWorkspaceUtilities.request({
                ...HOME,
                path: '/wp-admin/install.php?step=2',
                form: {
                    weblog_title: 'A site that survives',
                    user_name: 'admin',
                    admin_password: 'a password long enough',
                    admin_password2: 'a password long enough',
                    pw_weak: 'on',
                    admin_email: 'admin@example.com',
                    blog_public: '0',
                    language: ''
                }
            });
            await RunningWorkspaceUtilities.execInService(
                DEV_DOCKER_COMPOSE_FILE_NAME,
                'wordpress',
                'echo kept > /var/www/html/wp-content/uploads/kept.txt'
            );
            expect((await RunningWorkspaceUtilities.request(HOME)).body).toContain('A site that survives');

            await RunningWorkspaceUtilities.down(DEV_DOCKER_COMPOSE_FILE_NAME, false);
            await RunningWorkspaceUtilities.up(DEV_DOCKER_COMPOSE_FILE_NAME);

            // its database and its files come back with it
            const home: ServiceResponse = await RunningWorkspaceUtilities.waitFor(HOME, response => response.status === 200);
            expect(home.body).toContain('A site that survives');
            expect(await RunningWorkspaceUtilities.execInService(
                DEV_DOCKER_COMPOSE_FILE_NAME,
                'wordpress',
                'cat /var/www/html/wp-content/uploads/kept.txt'
            )).toBe('kept');
        }
        finally {
            await RunningWorkspaceUtilities.down(DEV_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, MAX_DOCKER_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});