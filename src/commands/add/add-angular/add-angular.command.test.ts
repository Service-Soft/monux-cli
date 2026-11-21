import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWebsite, RunningWorkspaceUtilities, ServiceResponse, WebsiteUtilities } from '../../../__testing__';
import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { DbType } from '../../../db';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { NpmUtilities } from '../../../npm';
import { AddZibriCommand } from '../add-zibri/add-zibri.command';
import { AddConfiguration, AddType } from '../models';
import { AddAngularCommand } from './add-angular.command';

/**
 * The list of the files of the service worker, as far as the test reads it.
 */
type ServiceWorkerFiles = {
    /**
     * The hash of each file, by its url.
     */
    hashTable: Record<string, string>
};

const mockConstants: MockConstants = getMockConstants('add-angular-command');

/**
 * Checks that the page of a language holds the text of index.html in that language, where Angular copies index.html:
 * in the page the server answers with, whose size in the manifest of the server has to fit, as it sends it as the
 * Content-Length of a page it serves as it is, like a prerendered one, and in the page the service worker keeps, whose
 * hash has to fit.
 * @param app - The built app, started.
 * @param dist - The dist folder of the app.
 * @param subPath - The path of the language.
 * @param text - The text the noscript holds in the language.
 */
async function expectIndexTranslation(app: RunningWebsite, dist: Path, subPath: string, text: string): Promise<void> {
    const response: Response = await fetch(`${app.url}/${subPath}/login`);
    const body: string = await response.text();
    expect(body).toContain(`<noscript>${text}</noscript>`);
    // the page of the app renders in the browser, so the server sends this one in chunks, rendered from the same copy
    const manifest: string = await FsUtilities.readFile(PathUtilities.resolve(dist, 'server', subPath, 'angular-app-manifest.mjs'));
    expect(manifest).toContain(`"index.csr.html": {size: ${Buffer.byteLength(body)},`);

    const page: string = await FsUtilities.readFile(PathUtilities.resolve(dist, 'browser', subPath, 'index.csr.html'));
    expect(page).toContain(`<noscript>${text}</noscript>`);
    const serviceWorkerFiles: ServiceWorkerFiles = await FsUtilities.parseFileAs(PathUtilities.resolve(dist, 'browser', subPath, 'ngsw.json'));
    expect(serviceWorkerFiles.hashTable[`/${subPath}/index.csr.html`]).toBe(createHash('sha1').update(page)
        .digest('hex'));
}

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
            languages: ['en', 'de']
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

        // the texts of the app and of the libraries, like the login of ngx-auth, in the translation of the other language,
        // which shows them in english until someone translates them
        const translation: string = await FsUtilities.readFile(PathUtilities.resolve(appPath, 'src', 'locale', 'messages.de.xlf'));
        expect(translation).toMatch(/<trans-unit id="users.heading"[^>]*>\s*<source>Users<\/source>\s*<target state="new">Users<\/target>/);
        expect(translation).toContain('<trans-unit id="ngx-auth.login.title"');
        expect(translation).toContain('<trans-unit id="ui.table.selectAllLabel"');
        // and the text of index.html, which Angular doesn't translate, translated as a developer would
        expect(translation).toContain('<target state="new">Admin needs JavaScript.</target>');
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(appPath, 'src', 'locale', 'messages.de.xlf'),
            '<target state="new">Admin needs JavaScript.</target>',
            '<target state="translated">Admin braucht `${JavaScript}`.</target>'
        );

        await GeneratedProjectUtilities.validate('admin');
        // a build of each language, below its code, with the text of index.html in it wherever Angular copied it to
        const builtApp: RunningWebsite = await WebsiteUtilities.start(appPath, 'admin', 4200);
        try {
            await expectIndexTranslation(builtApp, PathUtilities.resolve(appPath, 'dist', 'admin'), 'de', 'Admin braucht `${JavaScript}`.');
            await expectIndexTranslation(builtApp, PathUtilities.resolve(appPath, 'dist', 'admin'), 'en', 'Admin needs JavaScript.');
        }
        finally {
            builtApp.stop();
        }
        // the tests of the api are the ones of its own generator
        await NpmUtilities.run('api', 'build', false);
        await NpmUtilities.run('api', 'lint', false);
        await RunningWorkspaceUtilities.recordZibriVersion(PathUtilities.resolve(mockConstants.APPS_DIR, 'api'), 3000, 'db');

        // locally the app and its api run from their images, behind traefik, the app with the contract library in it
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            await RunningWorkspaceUtilities.waitFor({ host: 'api.localhost', path: '/health/ready', port: 80 }, response => response.status === 200);
            const app: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'admin.localhost', path: '/en/login', port: 80 },
                response => response.status === 200
            );
            expect(app.body).toContain('<app-root');
            // a link without a language, like the one of a password reset mail, goes to the language of the browser
            const withoutLanguage: ServiceResponse = await RunningWorkspaceUtilities.request({ host: 'admin.localhost', path: '/login', port: 80 });
            expect(withoutLanguage.status).toBe(302);
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 6) + (MAX_DOCKER_TIME * 2));

    afterEach(() => {
        jest.restoreAllMocks();
    });
});