import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities, ServiceResponse } from '../../../__testing__';
import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { NpmUtilities } from '../../../npm';
import { AddZibriCommand } from '../add-zibri/add-zibri.command';
import { AddConfiguration, AddType } from '../models';
import { AddAngularCommand } from './add-angular.command';

const mockConstants: MockConstants = getMockConstants('add-angular-command');

describe('AddAngularCommand', () => {
    const appPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'admin');
    const apiSource: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'api', 'src');
    const contractPath: Path = PathUtilities.resolve(mockConstants.LIBS_DIR, 'api-contract');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
    });

    test('adds an app for a zibri api that builds, lints and passes its tests, and connects the api to it', async () => {
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            features: ['pages'],
            defaultUserEmail: 'ada@example.com',
            defaultUserPassword: 'a password long enough',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'api',
            dbType: DbType.POSTGRES
        }));
        const apiConfig: AddConfiguration = { name: 'api', type: AddType.ZIBRI };
        await new AddZibriCommand(apiConfig).add();

        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            apiName: 'api',
            port: 4200,
            subDomain: 'admin',
            title: 'Admin',
            language: 'en'
        }));
        const baseConfig: AddConfiguration = { name: 'admin', type: AddType.ANGULAR };
        await new AddAngularCommand(baseConfig).add();

        const manifest: string = await FsUtilities.readFile(PathUtilities.resolve(appPath, 'public', 'manifest.webmanifest'));
        expect(manifest).toContain('"name": "Admin"');
        const prodCompose: string = await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML);
        expect(prodCompose).toContain('NG_ALLOWED_HOSTS: ${admin_sub_domain}.${prod_root_domain}');

        // the api takes the logs of the app, its requests from the browser, and links its password reset mails to it
        expect(await FsUtilities.readFile(PathUtilities.resolve(contractPath, 'src', 'log-application.enum.ts')))
            .toContain('    ADMIN = \'admin\'\n    // mx add adds the apps above this line');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiSource, 'cors-origins.ts')))
            .toContain('CORS_ORIGINS: CorsOrigin[] = resolveCorsOrigins([environment.admin_base_url]);');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiSource, 'env.ts')))
            .toContain('CONFIRM_PASSWORD_RESET_URL: `${environment.admin_base_url}/${AppPage.CONFIRM_PASSWORD_RESET}`,\n    ACCEPT_INVITATION_URL: `${environment.admin_base_url}/${AppPage.ACCEPT_INVITATION}`');
        // the app reads the contract of the api, built before each of its scripts that needs it, and in its image
        expect(await FsUtilities.readFile(PathUtilities.resolve(appPath, 'package.json')))
            .toContain('"prebuild": "npm run build --workspace=@add-angular-command/api-contract"');
        expect(await FsUtilities.readFile(PathUtilities.resolve(appPath, 'Dockerfile')))
            .toContain('COPY libs/api-contract libs/api-contract');
        expect(await FsUtilities.readFile(PathUtilities.resolve(mockConstants.APPS_DIR, 'api', '.env')))
            .toContain('admin_base_url=http://localhost:4200');

        await GeneratedProjectUtilities.validate('admin');
        // the tests of the api are the ones of its own generator
        await NpmUtilities.run('api', 'build', false);
        await NpmUtilities.run('api', 'lint', false);

        // locally the app and its api run from their images, behind traefik, the app with the contract library in it
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            await RunningWorkspaceUtilities.waitFor({ host: 'api.localhost', path: '/health/ready', port: 80 }, response => response.status === 200);
            const app: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'admin.localhost', path: '/login', port: 80 },
                response => response.status === 200
            );
            expect(app.body).toContain('<app-root');
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 6) + MAX_DOCKER_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});