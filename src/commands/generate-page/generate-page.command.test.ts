import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MockConstants, RunningWebsite, WebsiteUtilities } from '../../__testing__';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../encapsulation';
import { AddAngularWebsiteCommand } from '../add/add-angular-website';
import { AddConfiguration, AddType } from '../add/models';
import { GeneratePageCommand } from './generate-page.command';

const mockConstants: MockConstants = getMockConstants('generate-page-command');

describe('GeneratePageCommand', () => {
    const websitePath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'website');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 4200,
            subDomain: undefined,
            title: 'Shop',
            // one language, at the root, as before a website had more
            languages: ['en'],
            trackings: [],
            aiTraining: false,
            projectName: 'website',
            pageName: 'About us',
            pageTitle: 'About us | Shop',
            description: 'Who we are, and why we sell what we sell.',
            placement: 'navbar'
        }));
    });

    test('adds a prerendered page with a link in the navbar to a website', async () => {
        const baseConfig: AddConfiguration = { name: 'website', type: AddType.ANGULAR_WEBSITE };
        await new AddAngularWebsiteCommand(baseConfig).add();

        await new GeneratePageCommand().start(['gp']);

        expect(await FsUtilities.exists(PathUtilities.resolve(websitePath, 'src', 'app', 'pages', 'about-us', 'about-us.component.ts')))
            .toBe(true);
        expect(await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'app', 'app.component.ts')))
            .toContain('{ title: NavTitleComponent, link: NavLinkComponent }');
        // its texts, ready for a translation once the website has another language
        const texts: string = await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.xlf'));
        expect(texts).toContain('<trans-unit id="about-us.heading"');
        expect(texts).toContain('<trans-unit id="about-us.title"');

        await GeneratedProjectUtilities.validate('website');

        const page: string = await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'dist', 'website', 'browser', 'about-us', 'index.html'));
        expect(page).toContain('<meta name="description" content="Who we are, and why we sell what we sell.">');
        expect(page).toContain('href="/about-us"');

        const website: RunningWebsite = await WebsiteUtilities.start(websitePath, 'website', 4200);
        try {
            expect(await (await fetch(`${website.url}/sitemap.xml`)).text()).toContain('<loc>http://localhost:4200/about-us</loc>');
            expect(await (await fetch(`${website.url}/llms.txt`)).text())
                .toContain('- [About us | Shop](http://localhost:4200/about-us): Who we are, and why we sell what we sell.');
        }
        finally {
            website.stop();
        }
    }, MAX_ADD_TIME * 4);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});