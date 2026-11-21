import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { FileMockUtilities, GeneratedProjectUtilities, getMockConstants, inquireMock, MAX_ADD_TIME, MAX_DOCKER_TIME, MockConstants, RunningWorkspaceUtilities, ServiceResponse } from '../../../__testing__';
import { LOCAL_DOCKER_COMPOSE_FILE_NAME } from '../../../constants';
import { FsUtilities, InquirerUtilities, Path, PathUtilities } from '../../../encapsulation';
import { GenerateComponentCommand } from '../../generate-component';
import { AddAngularWebsiteCommand } from '../add-angular-website';
import { AddConfiguration, AddType } from '../models';
import { AddAngularLibraryCommand } from './add-angular-library.command';

const mockConstants: MockConstants = getMockConstants('add-angular-library-command');

describe('AddAngularLibraryCommand', () => {
    const libraryPath: Path = PathUtilities.resolve(mockConstants.LIBS_DIR, 'components');
    const websitePath: Path = PathUtilities.resolve(mockConstants.APPS_DIR, 'website');
    const homePath: Path = PathUtilities.resolve(websitePath, 'src', 'app', 'pages', 'home');

    beforeEach(async () => {
        await FileMockUtilities.setup(mockConstants);
        InquirerUtilities['inquire'] = jest.fn(inquireMock({
            port: 4200,
            subDomain: undefined,
            title: 'Shop',
            languages: ['en'],
            trackings: [],
            aiTraining: false,
            scope: '@shop',
            prefix: 'shop',
            componentName: 'Notice',
            projects: ['website']
        }));
    });

    test('adds a library whose components a website imports one by one, with stories that pass AXE', async () => {
        await new AddAngularWebsiteCommand({ name: 'website', type: AddType.ANGULAR_WEBSITE }).add();
        const baseConfig: AddConfiguration = { name: 'components', type: AddType.ANGULAR_LIBRARY };
        await new AddAngularLibraryCommand(baseConfig).add();

        // a package like the @service-soft libraries: one entry point per component, and tailwind sources for the app
        expect(await FsUtilities.exists(PathUtilities.resolve(libraryPath, 'dist', 'fesm2022', 'shop-components-notice.mjs'))).toBe(true);
        expect(await FsUtilities.readFile(PathUtilities.resolve(libraryPath, 'dist', 'tailwind.css'))).toContain('@source "./fesm2022";');
        // which the website builds before its scripts, and styles its components with
        expect(await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'package.json')))
            .toContain('"prebuild": "npm run build --workspace=@shop/components"');
        expect(await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'styles.css'))).toContain('@import "@shop/components";');

        InquirerUtilities['inquire'] = jest.fn(inquireMock({ projectName: 'components', componentName: 'Opening hours' }));
        await new GenerateComponentCommand().start(['gc']);
        expect(await FsUtilities.readFile(PathUtilities.resolve(libraryPath, 'opening-hours', 'opening-hours.component.ts')))
            .toContain('selector: \'shop-opening-hours\'');

        // the website uses one of the two components
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(homePath, 'home.component.ts'),
            'import { Component } from \'@angular/core\';',
            'import { Component } from \'@angular/core\';\nimport { NoticeComponent } from \'@shop/components/notice\';'
        );
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(homePath, 'home.component.ts'),
            'templateUrl: \'./home.component.html\'',
            'templateUrl: \'./home.component.html\',\n    imports: [NoticeComponent]'
        );
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(homePath, 'home.component.html'),
            '</section>',
            '    <shop-notice class="mt-4" color="primary">Opening hours changed</shop-notice>\n</section>'
        );

        // its build, its lint, the tests of its components and the AXE checks of its stories in light and dark mode
        await GeneratedProjectUtilities.validate('components');
        expect(await FsUtilities.exists(PathUtilities.resolve(libraryPath, 'storybook-static', 'index.json'))).toBe(true);

        await GeneratedProjectUtilities.validate('website');
        const browser: Path = PathUtilities.resolve(websitePath, 'dist', 'website', 'browser');
        expect(await FsUtilities.readFile(PathUtilities.resolve(browser, 'index.html'))).toContain('Opening hours changed</shop-notice>');
        // nothing of the component the website does not import
        const files: string[] = await FsUtilities.findFilesRecursive(browser);
        const contents: string[] = await Promise.all(files.filter(f => /\.(m?js|html)$/.test(f)).map(f => FsUtilities.readFile(PathUtilities.resolve(browser, f))));
        expect(contents.filter(c => c.includes('shop-opening-hours'))).toEqual([]);

        // the image of the website builds the library in it, and its page shows the component
        try {
            await RunningWorkspaceUtilities.up(LOCAL_DOCKER_COMPOSE_FILE_NAME);
            const home: ServiceResponse = await RunningWorkspaceUtilities.waitFor(
                { host: 'localhost', path: '/', port: 80 },
                response => response.status === 200
            );
            expect(home.body).toContain('Opening hours changed</shop-notice>');
        }
        finally {
            await RunningWorkspaceUtilities.down(LOCAL_DOCKER_COMPOSE_FILE_NAME, true);
        }
    }, (MAX_ADD_TIME * 4) + MAX_DOCKER_TIME);

    afterEach(() => {
        jest.restoreAllMocks();
    });
});