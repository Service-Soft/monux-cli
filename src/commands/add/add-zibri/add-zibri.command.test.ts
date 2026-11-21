import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities } from '../../../__testing__';
import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddZibriCommand } from './add-zibri.command';

const mockConstants: MockConstants = getMockConstants('add-zibri-command');

describe('AddZibriCommand', () => {
    const apiPath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'api');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            subDomain: 'api',
            port: 3000,
            features: ['pages', 'metricsDashboard', 'logEmail'],
            defaultUserEmail: 'ada@example.com',
            defaultUserPassword: 'a password long enough',
            dbComposeService: 'NEW',
            dbComposeServiceName: 'db',
            databaseName: 'api',
            dbType: DbType.POSTGRES
        }));
    });

    test('adds an api that builds, lints and passes its tests, with its values read at runtime', async () => {
        const baseConfig: AddConfiguration = { name: 'api', type: AddType.ZIBRI };
        await new AddZibriCommand(baseConfig).add();

        const environment: string = await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'environment', 'environment.ts'));
        expect(environment).toContain('api_jwt_access_secret: readString(\'api_jwt_access_secret\')');
        expect(environment).toContain('webserver_mail_host: readOptionalString(\'webserver_mail_host\')');
        const secret: string = (await FsUtilities.readFileLines(PathUtilities.resolve(apiPath, '.env')))
            .find(l => l.startsWith('api_jwt_access_secret='))
            ?.split('=')[1] ?? '';
        expect(secret).toHaveLength(64);
        expect(environment).not.toContain(secret);

        const compose: string = await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML);
        expect(compose).toContain('            - ./apps/api/.env');
        expect(compose).toContain('            - api-zibri:/workspace/apps/api/.zibri');

        const applicationOptions: string = await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'application-options.base.ts'));
        expect(applicationOptions).toContain('        AppAuthController,\n        UserController,\n        TenantController,\n        InvitationController,\n        RoleController,\n        LogController\n    ],');
        expect(applicationOptions).not.toContain('additionalAllowedHeaders');
        expect(await FsUtilities.exists(PathUtilities.resolve(apiPath, '.env.example'))).toBe(false);

        // what the api and its apps agree on is in its contract library, which the api builds first, also in its image
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'models', 'permissions.ts')))
            .toContain('from \'@add-zibri-command/api-contract\'');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'package.json')))
            .toContain('"prebuild": "npm run build --workspace=@add-zibri-command/api-contract"');
        // the install scripts zibri decided on are in the root, the only package.json npm reads them from in a workspace
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'package.json'))).not.toContain('allowScripts');
        expect(await FsUtilities.readFile(mockConstants.ROOT_PACKAGE_JSON)).toContain('"@parcel/watcher": false');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'Dockerfile')))
            .toContain('RUN npm ci --workspace apps/api --workspace libs/api-contract');
        // the mails of invitations link to the page that accepts them, and tenants can be deleted
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'controllers', 'auth.controller.ts'))).toContain('invitationRoutes: true');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'providers.ts'))).toContain('token: ZIBRI_DI_TOKENS.INVITATION_OPTIONS,');
        // only stage and prod send mails, so the images of the local compose file start without a mail server
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'providers.ts'))).toContain('useFactory: () => !SENDS_MAILS');
        expect(await FsUtilities.readFile(PathUtilities.resolve(apiPath, 'src', 'data-sources', 'db', 'entities.ts'))).toContain('    TenantDeletion,\n    Invitation,');

        await GeneratedProjectUtilities.validate('api');

        // started once in development, the api records the version it runs, which its image only reads
        await RunningWorkspaceUtilities.recordZibriVersion(apiPath, 3000, 'db');
        const versions: string[] = await FsUtilities.findFilesRecursive(PathUtilities.resolve(apiPath, 'versions'));
        expect(versions.filter(f => f.endsWith('.json'))).toHaveLength(1);

        // locally the api runs from its image, behind traefik, and is ready once it reached its database
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            await RunningWorkspaceUtilities.waitFor({ host: 'api.localhost', path: '/health/ready', port: 80 }, response => response.status === 200);
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 3) + (MAX_DOCKER_TIME * 2));

    afterEach(() => {
        jest.restoreAllMocks();
    });
});