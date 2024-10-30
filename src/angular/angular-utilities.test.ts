import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AngularUtilities } from './angular.utilities';
import { fakeTsImportDefinition, FileMockUtilities, mockConstants } from '../__testing__';
import { CPUtilities, FsUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TsImportDefinition } from '../ts';

let npmInstallMock: jest.SpiedFunction<typeof NpmUtilities.install>;
let cpExecSyncMock: jest.SpiedFunction<typeof CPUtilities.execSync>;

describe('AngularUtilities', () => {
    beforeEach(async () => {
        await FileMockUtilities.clearTemp();
        await FileMockUtilities.createAppComponentTsFile();
        await FileMockUtilities.createAppComponentHtmlFile();
        await FileMockUtilities.createAppRoutesTs();
        await FileMockUtilities.createAppConfig();
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
            '    styleUrl: \'./app.component.scss\'',
            '})',
            'export class AppComponent {}'
        ]);
    });

    test('addNavigation', async () => {
        await AngularUtilities.addNavigation(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        expect(npmInstallMock).toHaveBeenCalledTimes(1);
        expect(npmInstallMock).toHaveBeenCalledWith(mockConstants.ANGULAR_APP_NAME, ['ngx-material-navigation', '@fortawesome/angular-fontawesome', '@fortawesome/free-solid-svg-icons']);

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
            '    styleUrl: \'./app.component.scss\'',
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
            'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation}\';',
            '',
            'export const navbarRows: NavbarRow<NavRoute>[] = [',
            '    {',
            '        elements: [',
            '            {',
            '                type: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
            '                title: \'Home\',',
            '                link: {',
            '                    title: \'Home\',',
            '                    path: \'\',',
            '                    loadComponent: () => import(\'./pages/home/home.component\').then(m => m.HomeComponent)',
            '                },',
            '                collapse: \'never\'',
            '            }',
            '        ]',
            '    }',
            '];',
            '',
            'export const footerRows: FooterRow[] = [];',
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
        await AngularUtilities.addPwaSupport(mockConstants.ANGULAR_APP_DIR, mockConstants.ANGULAR_APP_NAME);

        expect(cpExecSyncMock).toHaveBeenCalledTimes(1);
        expect(cpExecSyncMock).toHaveBeenCalledWith(`cd ${mockConstants.ANGULAR_APP_DIR} && npx @angular/cli add @angular/pwa --skip-confirmation`);
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
            '    styleUrl: \'./app.component.scss\'',
            '})',
            'export class AppComponent {}'
        ]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});