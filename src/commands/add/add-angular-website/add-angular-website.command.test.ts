import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, LighthouseRating, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWebsite, RunningWorkspaceUtilities, ServiceRequest, ServiceResponse, WebsiteUtilities } from '../../../__testing__';
import { LOCAL_DOCKER_COMPOSE_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { AddConfiguration, AddType } from '../models';
import { AddAngularWebsiteCommand } from './add-angular-website.command';

const mockConstants: MockConstants = getMockConstants('add-angular-website-command');

describe('AddAngularWebsiteCommand', () => {
    const websitePath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'website');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 4200,
            subDomain: undefined,
            title: 'Shop',
            languages: ['en', 'de'],
            trackings: ['googleAnalytics'],
            aiTraining: false
        }));
    });

    test('adds a website that builds, lints and passes its tests', async () => {
        const baseConfig: AddConfiguration = { name: 'website', type: AddType.ANGULAR_WEBSITE };
        await new AddAngularWebsiteCommand(baseConfig).add();

        const index: string = await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'index.html'));
        expect(index).toContain('<html lang="en">');
        expect(index).toContain('<title>Shop</title>');
        expect(await FsUtilities.readFile(mockConstants.ENV_PUBLIC)).toContain('website_google_analytics_id=G-XXXXXXXXXX');
        expect(await FsUtilities.exists(PathUtilities.resolve(websitePath, 'src', 'app', 'tracking.provider.ts'))).toBe(true);

        const prodCompose: string = await FsUtilities.readFile(mockConstants.DOCKER_COMPOSE_YAML);
        expect(prodCompose).toContain('NG_ALLOWED_HOSTS: ${prod_root_domain},www.${prod_root_domain}');
        const stageCompose: string = await FsUtilities.readFile(mockConstants.STAGE_DOCKER_COMPOSE_YAML);
        expect(stageCompose).toContain('NG_ALLOWED_HOSTS: ${stage_root_domain},www.${stage_root_domain}');

        // every text marked for translation, in the translation of the other language, which shows them in english
        // until someone translates them
        const translation: string = await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.de.xlf'));
        expect(translation).toContain('target-language="de"');
        expect(translation).toMatch(/<trans-unit id="imprint.heading"[^>]*>\s*<source>Imprint<\/source>\s*<target state="new">Imprint<\/target>/);
        // and the ones of the libraries, like the consent dialog of ngx-tracking
        expect(translation).toContain('<trans-unit id="ngx-tracking.consent.title"');

        await GeneratedProjectUtilities.validate('website');

        // a build of each language, below its code
        const browser: Path = PathUtilities.resolve(websitePath, 'dist', 'website', 'browser');
        const prerendered: string = await FsUtilities.readFile(PathUtilities.resolve(browser, 'en', 'imprint', 'index.html'));
        expect(prerendered).toContain('<title>Imprint | Shop</title>');
        expect(prerendered).toContain('<meta name="description" content="Who runs Shop, and how to reach them.">');
        expect(prerendered).toContain('<link rel="canonical" href="http://localhost:4200/en/imprint">');
        // the page in the other language, and its url without one, which redirects by the language of the visitor
        expect(prerendered).toContain('<link rel="alternate" hreflang="de" href="http://localhost:4200/de/imprint">');
        expect(prerendered).toContain('<link rel="alternate" hreflang="x-default" href="http://localhost:4200/imprint">');
        const home: string = await FsUtilities.readFile(PathUtilities.resolve(browser, 'en', 'index.html'));
        expect(home).toMatch(/<script type="application\/ld\+json"[^>]*>\{"@context":"https:\/\/schema.org","@type":"WebSite","name":"Shop"/);
        expect(home).toContain('ngx-language-switcher');
        const germanHome: string = await FsUtilities.readFile(PathUtilities.resolve(browser, 'de', 'index.html'));
        expect(germanHome).toContain('<html lang="de"');
        expect(germanHome).toContain('"inLanguage":"de"');
        expect(germanHome).toContain('<link rel="canonical" href="http://localhost:4200/de">');

        // the goals of the website, measured on the build its docker image runs
        // on the port of development, which the canonical urls of a build for development name
        const website: RunningWebsite = await WebsiteUtilities.start(websitePath, 'website', 4200);
        try {
            const sitemap: string = await (await fetch(`${website.url}/sitemap.xml`)).text();
            expect(sitemap).toContain('<loc>http://localhost:4200/en/imprint</loc>');
            expect(sitemap).toContain('<loc>http://localhost:4200/de/imprint</loc>');
            expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="http://localhost:4200/imprint"/>');
            const llms: string = await (await fetch(`${website.url}/llms.txt`)).text();
            expect(llms).toContain('- [Imprint | Shop](http://localhost:4200/en/imprint): Who runs Shop, and how to reach them.');
            expect(llms).toContain('- [de](http://localhost:4200/de/llms.txt)');
            expect(await (await fetch(`${website.url}/de/llms.txt`)).text()).toContain('(http://localhost:4200/de/imprint)');
            expect((await fetch(`${website.url}/en/unknown`)).status).toBe(404);

            // each page has one url: below its language, which an url without one redirects to by the browser's language
            const withoutLanguage: Response = await fetch(`${website.url}/imprint?from=search`, {
                redirect: 'manual',
                headers: { 'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8' }
            });
            expect([withoutLanguage.status, withoutLanguage.headers.get('location')]).toEqual([302, '/de/imprint?from=search']);
            expect(withoutLanguage.headers.get('vary')).toContain('Accept-Language');
            const withSlash: Response = await fetch(`${website.url}/en/imprint/`, { redirect: 'manual' });
            expect([withSlash.status, withSlash.headers.get('location')]).toEqual([301, '/en/imprint']);

            const page: string = `${website.url}/en`;
            expect(await WebsiteUtilities.findThirdPartyRequests(page)).toEqual([]);
            // a new visitor sees the page first, and has to decide as soon as they do anything with it
            expect(await WebsiteUtilities.resolveConsentDialog(page)).toEqual({ openOnLoad: false, openAfterInteraction: true });
            const rating: LighthouseRating = await WebsiteUtilities.resolveLighthouseRating(page);
            // the audits first, so a failure says what to fix
            expect(rating.failedAudits).toEqual([]);
            expect(rating.scores).toEqual({ performance: 1, accessibility: 1, seo: 1 });
        }
        finally {
            website.stop();
        }

        // locally the website runs from its image, behind traefik, and search engines may read it
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            const local: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'localhost', path: '/en', port: 80 },
                response => response.status === 200
            );
            expect(local.body).toContain('Shop</h1>');
            expect((await RunningWorkspaceUtilities.request({ host: 'localhost', path: '/robots.txt', port: 80 })).body)
                .toContain('User-agent: *\nAllow: /');
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }

        // stage is behind basic auth, and tells search engines to stay away, as it is reachable from the internet
        try {
            await RunningWorkspaceUtilities.up(STAGE_DOCKER_COMPOSE_FILE_NAME);
            const stage: ServiceRequest = { host: 'test-staging.com', path: '/robots.txt', port: 443, https: true };
            await RunningWorkspaceUtilities.waitFor(stage, response => response.status === 401);
            const robots: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { ...stage, auth: { user: 'user', password: 'password' } },
                response => response.status === 200
            );
            expect(robots.body).toContain('User-agent: *\nDisallow: /');
        }
        finally {
            await RunningWorkspaceUtilities.down(STAGE_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 6) + (MAX_DOCKER_TIME * 2));

    afterEach(() => {
        jest.restoreAllMocks();
    });
});