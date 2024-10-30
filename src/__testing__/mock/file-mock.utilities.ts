/* eslint-disable jsdoc/require-jsdoc */
import { mockConstants } from './constants';
import { FsUtilities } from '../../encapsulation';

export abstract class FileMockUtilities {

    static async createPackageJson(): Promise<void> {
        await FsUtilities.createFile(mockConstants.PACKAGE_JSON, [
            '{',
            '    "name": "@library/library",',
            '    "version": "1.0.0",',
            '    "main": "index.js",',
            '    "scripts": {',
            '        "test": "echo \\\"Error: no test specified\\\" && exit 1"',
            '    },',
            '    "keywords": [],',
            '    "author": "",',
            '    "license": "ISC",',
            '    "description": ""',
            '}'
        ], true, false);
    }

    static async createAppComponentTsFile(): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_COMPONENT_TS, [
            'import { Component } from \'@angular/core\';',
            'import { RouterOutlet } from \'@angular/router\';',
            '',
            '@Component({',
            '\tselector: \'app-root\',',
            '\tstandalone: true,',
            '\timports: [RouterOutlet],',
            '\ttemplateUrl: \'./app.component.html\',',
            '\tstyleUrl: \'./app.component.scss\'',
            '})',
            'export class AppComponent {}'
        ], true, false);
    }

    static async createAppComponentHtmlFile(): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_COMPONENT_HTML, [''], true, false);
    }

    static async createAppRoutesTs(): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_APP_ROUTES_TS, [
            'import { Routes } from \'@angular/router\';',
            '',
            'export const routes: Routes = [];'
        ], true, false);
    }

    static async createAppConfig(): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_APP_CONFIG_TS, [
            'import { ApplicationConfig, provideZoneChangeDetection } from \'@angular/core\';',
            'import { provideClientHydration } from \'@angular/platform-browser\';',
            'import { provideRouter } from \'@angular/router\';',
            '',
            'import { routes } from \'./app.routes\';',
            '',
            'export const appConfig: ApplicationConfig = {',
            '\tproviders: [',
            '\t\tprovideZoneChangeDetection({ eventCoalescing: true }),',
            '\t\tprovideRouter(routes),',
            '\t\tprovideClientHydration()',
            '\t]',
            '};'
        ], true, false);
    }

    static async clearTemp(): Promise<void> {
        await FsUtilities.rm(mockConstants.TMP_DIR);
        await FsUtilities.mkdir(mockConstants.ANGULAR_APP_DIR, true, false);
        await FsUtilities.mkdir(mockConstants.TS_LIBRARY_DIR, true, false);
    }
}