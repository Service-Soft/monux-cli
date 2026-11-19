import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, LighthouseScores, MAX_ADD_TIME, MockConstants, RunningWebsite, WebsiteUtilities } from '../../../__testing__';
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
            language: 'en',
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

        await GeneratedProjectUtilities.validate('website');

        const browser: Path = PathUtilities.resolve(websitePath, 'dist', 'website', 'browser');
        const prerendered: string = await FsUtilities.readFile(PathUtilities.resolve(browser, 'imprint', 'index.html'));
        expect(prerendered).toContain('<title>Imprint | Shop</title>');
        expect(prerendered).toContain('<meta name="description" content="Who runs Shop, and how to reach them.">');
        const home: string = await FsUtilities.readFile(PathUtilities.resolve(browser, 'index.html'));
        expect(home).toContain('<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Shop"');

        // the goals of the website, measured on the build its docker image runs
        const website: RunningWebsite = await WebsiteUtilities.start(websitePath, 'website', 4310);
        try {
            const sitemap: string = await (await fetch(`${website.url}/sitemap.xml`)).text();
            expect(sitemap).toContain('<url><loc>http://localhost:4200/imprint</loc></url>');
            const llms: string = await (await fetch(`${website.url}/llms.txt`)).text();
            expect(llms).toContain('- [Imprint | Shop](http://localhost:4200/imprint): Who runs Shop, and how to reach them.');
            expect((await fetch(`${website.url}/unknown`)).status).toBe(404);

            expect(await WebsiteUtilities.findThirdPartyRequests(website.url)).toEqual([]);
            const scores: LighthouseScores = await WebsiteUtilities.resolveLighthouseScores(website.url);
            expect(scores).toEqual({ performance: 1, accessibility: 1, seo: 1 });
        }
        finally {
            website.stop();
        }
    }, MAX_ADD_TIME * 6);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});