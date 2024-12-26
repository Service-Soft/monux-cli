import path from 'path';

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AngularUtilities } from './angular.utilities';
import { fakeAddNavElementConfig, fakeTsImportDefinition, FileMockUtilities, getMockConstants, MockConstants } from '../__testing__';
import { CPUtilities, FsUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TsImportDefinition } from '../ts';
import { AddNavElementConfig } from './add-nav-element-config.model';

const mockConstants: MockConstants = getMockConstants('angular-utilities');

let npmInstallMock: jest.SpiedFunction<typeof NpmUtilities.install>;
let cpExecSyncMock: jest.SpiedFunction<typeof CPUtilities.execSync>;

describe('AngularUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp(mockConstants);
        await FileMockUtilities.createAppComponentTsFile(mockConstants);
        await FileMockUtilities.createAppComponentHtmlFile(mockConstants);
        await FileMockUtilities.createAppRoutesTs(mockConstants);
        await FileMockUtilities.createAppConfig(mockConstants);
        await FileMockUtilities.createAngularJson(mockConstants);
        npmInstallMock = jest.spyOn(NpmUtilities, 'install').mockImplementation(async () => {});
        cpExecSyncMock = jest.spyOn(CPUtilities, 'execSync').mockImplementation(() => {});
    });

    test('addComponentImports', async () => {
        const def: TsImportDefinition = fakeTsImportDefinition();
        await AngularUtilities['addComponentImports'](mockConstants.ANGULAR_COMPONENT_TS, [def]);
        const lines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_TS);
        expect(lines).toEqual([
            def.defaultImport ? `import ${def.element} from '${def.path}';` : `import { ${def.element} } from '${def.path}';`,
            'import { Component } from \'@angular/core\';',
            'import { RouterOutlet } from \'@angular/router\';',
            '',
            '@Component({',
            '    selector: \'app-root\',',
            '    standalone: true,',
            `    imports: [RouterOutlet, ${def.element}],`,
            '    templateUrl: \'./app.component.html\',',
            '    styleUrl: \'./app.component.css\'',
            '})',
            'export class AppComponent {}'
        ]);
    });

    test('setupNavigation', async () => {
        await AngularUtilities.setupNavigation(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        expect(npmInstallMock).toHaveBeenCalledTimes(1);
        expect(npmInstallMock).toHaveBeenCalledWith(mockConstants.ANGULAR_APP_NAME, ['ngx-material-navigation']);

        const htmlLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_HTML);
        expect(htmlLines).toEqual([
            '<ngx-mat-navigation-navbar [minHeight]="80" [minSidenavWidth]="\'30%\'" [minHeightOtherElements]="70" [navbarRows]="navbarRows">',
            '    <router-outlet></router-outlet>',
            '</ngx-mat-navigation-navbar>',
            '',
            '<ngx-mat-navigation-footer [minHeight]="70" [footerRows]="footerRows"></ngx-mat-navigation-footer>'
        ]);

        const tsLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_TS);
        expect(tsLines).toEqual([
            'import { navbarRows, footerRows } from \'./routes\';',
            'import { FooterRow, NavbarRow, NgxMatNavigationFooterComponent, NgxMatNavigationNavbarComponent } from \'ngx-material-navigation\';',
            'import { Component } from \'@angular/core\';',
            'import { RouterOutlet } from \'@angular/router\';',
            '',
            '@Component({',
            '    selector: \'app-root\',',
            '    standalone: true,',
            '    imports: [RouterOutlet, NgxMatNavigationNavbarComponent, NgxMatNavigationFooterComponent],',
            '    templateUrl: \'./app.component.html\',',
            '    styleUrl: \'./app.component.css\'',
            '})',
            'export class AppComponent {',
            '    navbarRows: NavbarRow[] = navbarRows;',
            '    footerRows: FooterRow[] = footerRows;',
            '}'
        ]);
        const appRoutesExist: boolean = await FsUtilities.exists(mockConstants.ANGULAR_APP_ROUTES_TS);
        const routesExist: boolean = await FsUtilities.exists(mockConstants.ANGULAR_ROUTES_TS);
        expect(appRoutesExist).toEqual(false);
        expect(routesExist).toEqual(true);

        const routesLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ROUTES_TS);
        expect(routesLines).toEqual([
            'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation\';',
            '',
            'export const navbarRows: NavbarRow<NavRoute>[] = [',
            '    {',
            '        elements: []',
            '    }',
            '];',
            '',
            'export const footerRows: FooterRow[] = [',
            '    {',
            '        elements: []',
            '    }',
            '];',
            '',
            'const notFoundRoute: NavRoute = {',
            '    title: \'Page not found\',',
            '    path: \'**\',',
            '    component: NgxMatNavigationNotFoundComponent,',
            '    data: {',
            '        pageNotFoundConfig: {',
            '            homeRoute: \'\',',
            '            title: \'Page not found\',',

            '            message: \'The page you are looking for might have been removed, had its name changed or is temporarily unavailable.\',',
            '            buttonLabel: \'Homepage\'',
            '        }',
            '    }',
            '};',
            '',
            'export const routes: NavRoute[] = NavUtilities.getAngularRoutes(navbarRows, footerRows, [notFoundRoute]);'
        ]);
    });

    test('generatePage for navbar', async () => {
        await AngularUtilities.setupNavigation(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        cpExecSyncMock.mockRestore(); // restores the mock so that 'ng generate component will actually be executed'
        const addNavElementConfig: AddNavElementConfig = fakeAddNavElementConfig();

        await AngularUtilities.generatePage(
            mockConstants.ANGULAR_APP_DIR,
            'Test',
            addNavElementConfig,
            undefined
        );

        const exists: boolean[] = await Promise.all([
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test', 'test.component.ts')),
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test', 'test.component.html'))
        ]);

        expect(exists.some(e => !e)).toBe(false);

        const routesLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ROUTES_TS);
        expect(routesLines).toEqual([
            'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation\';',
            '',
            'export const navbarRows: NavbarRow<NavRoute>[] = [',
            '    {',
            '        elements: [',
            '            {',
            '                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
            '                title: \'Test\',',
            '                link: {',
            '                    route: {',
            '                        path: \'\',',
            '                        title: \'Test | Website\',',
            '                        loadComponent: () => import(\'./pages/test/test.component\').then(m => m.TestComponent)',
            '                    }',
            '                }',
            '            }',
            '        ]',
            '    }',
            '];',
            '',
            'export const footerRows: FooterRow[] = [',
            '    {',
            '        elements: []',
            '    }',
            '];',
            '',
            'const notFoundRoute: NavRoute = {',
            '    title: \'Page not found\',',
            '    path: \'**\',',
            '    component: NgxMatNavigationNotFoundComponent,',
            '    data: {',
            '        pageNotFoundConfig: {',
            '            homeRoute: \'\',',
            '            title: \'Page not found\',',
            '            message: \'The page you are looking for might have been removed, had its name changed or is temporarily unavailable.\',',
            '            buttonLabel: \'Homepage\'',
            '        }',
            '    }',
            '};',
            '',
            'export const routes: NavRoute[] = NavUtilities.getAngularRoutes(navbarRows, footerRows, [notFoundRoute]);'
        ]);

        await AngularUtilities.generatePage(
            mockConstants.ANGULAR_APP_DIR,
            'TestTest',
            addNavElementConfig,
            undefined
        );
        const exists2: boolean[] = await Promise.all([
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test-test', 'test-test.component.ts')),
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test-test', 'test-test.component.html'))
        ]);
        expect(exists2.some(e => !e)).toBe(false);

        const routesLines2: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ROUTES_TS);
        expect(routesLines2).toEqual([
            'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation\';',
            '',
            'export const navbarRows: NavbarRow<NavRoute>[] = [',
            '    {',
            '        elements: [',
            '            {',
            '                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
            '                title: \'Test\',',
            '                link: {',
            '                    route: {',
            '                        path: \'\',',
            '                        title: \'Test | Website\',',
            '                        loadComponent: () => import(\'./pages/test/test.component\').then(m => m.TestComponent)',
            '                    }',
            '                }',
            '            },',
            '            {',
            '                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
            '                title: \'Test\',',
            '                link: {',
            '                    route: {',
            '                        path: \'\',',
            '                        title: \'Test | Website\',',
            '                        loadComponent: () => import(\'./pages/test/test.component\').then(m => m.TestComponent)',
            '                    }',
            '                }',
            '            }',
            '        ]',
            '    }',
            '];',
            '',
            'export const footerRows: FooterRow[] = [',
            '    {',
            '        elements: []',
            '    }',
            '];',
            '',
            'const notFoundRoute: NavRoute = {',
            '    title: \'Page not found\',',
            '    path: \'**\',',
            '    component: NgxMatNavigationNotFoundComponent,',
            '    data: {',
            '        pageNotFoundConfig: {',
            '            homeRoute: \'\',',
            '            title: \'Page not found\',',
            '            message: \'The page you are looking for might have been removed, had its name changed or is temporarily unavailable.\',',
            '            buttonLabel: \'Homepage\'',
            '        }',
            '    }',
            '};',
            '',
            'export const routes: NavRoute[] = NavUtilities.getAngularRoutes(navbarRows, footerRows, [notFoundRoute]);'
        ]);
    });

    test('generatePage for footer', async () => {
        await AngularUtilities.setupNavigation(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        cpExecSyncMock.mockRestore(); // restores the mock so that 'ng generate component will actually be executed'
        const addNavElementConfig: AddNavElementConfig = fakeAddNavElementConfig('footer');
        await AngularUtilities.generatePage(
            mockConstants.ANGULAR_APP_DIR,
            'Test',
            addNavElementConfig,
            undefined
        );

        const exists: boolean[] = await Promise.all([
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test', 'test.component.ts')),
            FsUtilities.exists(path.join(mockConstants.ANGULAR_APP_DIR, 'src', 'app', 'pages', 'test', 'test.component.html'))
        ]);
        expect(exists.some(e => !e)).toBe(false);

        const routesLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_ROUTES_TS);
        expect(routesLines).toEqual([
            'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation\';',
            '',
            'export const navbarRows: NavbarRow<NavRoute>[] = [',
            '    {',
            '        elements: []',
            '    }',
            '];',
            '',
            'export const footerRows: FooterRow[] = [',
            '    {',
            '        elements: [',
            '            {',
            '                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
            '                title: \'Test\',',
            '                link: {',
            '                    route: {',
            '                        path: \'\',',
            '                        title: \'Test | Website\',',
            '                        loadComponent: () => import(\'./pages/test/test.component\').then(m => m.TestComponent)',
            '                    }',
            '                }',
            '            }',
            '        ]',
            '    }',
            '];',
            '',
            'const notFoundRoute: NavRoute = {',
            '    title: \'Page not found\',',
            '    path: \'**\',',
            '    component: NgxMatNavigationNotFoundComponent,',
            '    data: {',
            '        pageNotFoundConfig: {',
            '            homeRoute: \'\',',
            '            title: \'Page not found\',',
            '            message: \'The page you are looking for might have been removed, had its name changed or is temporarily unavailable.\',',
            '            buttonLabel: \'Homepage\'',
            '        }',
            '    }',
            '};',
            '',
            'export const routes: NavRoute[] = NavUtilities.getAngularRoutes(navbarRows, footerRows, [notFoundRoute]);'
        ]);
    });

    test('addPwaSupport', async () => {
        await AngularUtilities.setupPwa(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        expect(cpExecSyncMock).toHaveBeenCalledTimes(1);
        expect(cpExecSyncMock).toHaveBeenCalledWith(`cd ${mockConstants.ANGULAR_APP_DIR} && npx @angular/cli@18 add @angular/pwa@18 --skip-confirmation`);
        expect(npmInstallMock).toHaveBeenCalledTimes(1);
        expect(npmInstallMock).toHaveBeenCalledWith(mockConstants.ANGULAR_APP_NAME, ['ngx-pwa']);

        const htmlLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_HTML);
        const tsLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_COMPONENT_TS);

        expect(htmlLines).toEqual(['<ngx-pwa-offline-status-bar></ngx-pwa-offline-status-bar>']);
        expect(tsLines).toEqual([
            'import { NgxPwaOfflineStatusBarComponent } from \'ngx-pwa\';',
            'import { Component } from \'@angular/core\';',
            'import { RouterOutlet } from \'@angular/router\';',
            '',
            '@Component({',
            '    selector: \'app-root\',',
            '    standalone: true,',
            '    imports: [RouterOutlet, NgxPwaOfflineStatusBarComponent],',
            '    templateUrl: \'./app.component.html\',',
            '    styleUrl: \'./app.component.css\'',
            '})',
            'export class AppComponent {}'
        ]);
    });

    test('addProvider', async () => {
        await AngularUtilities['addProvider'](
            mockConstants.ANGULAR_APP_DIR,
            {
                provide: 'test',
                useValue: 42
            },
            []
        );

        const tsLines: string[] = await FsUtilities.readFileLines(mockConstants.ANGULAR_APP_CONFIG_TS);

        expect(tsLines).toEqual([
            'import { ApplicationConfig, provideZoneChangeDetection } from \'@angular/core\';',
            'import { provideClientHydration } from \'@angular/platform-browser\';',
            'import { provideRouter } from \'@angular/router\';',
            '',
            'import { routes } from \'./app.routes\';',
            '',
            'export const appConfig: ApplicationConfig = {',
            '    providers: [',
            '        provideZoneChangeDetection({ eventCoalescing: true }),',
            '        provideRouter(routes),',
            '        provideClientHydration(),',
            '        {',
            '            provide: \'test\',',
            '            useValue: 42',
            '        }',
            '    ]',
            '};'
        ]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});