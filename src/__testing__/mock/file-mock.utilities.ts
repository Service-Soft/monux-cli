/* eslint-disable jsdoc/require-jsdoc */
import { MockConstants } from './constants';
import { AngularJson } from '../../angular';
import { CPUtilities, FsUtilities, JsonUtilities } from '../../encapsulation';

export abstract class FileMockUtilities {

    static async createAngularJson(mockConstants: MockConstants): Promise<void> {
        const data: AngularJson = {
            $schema: '',
            version: 1,
            newProjectRoot: '',
            projects: {
                website: {
                    projectType: 'application',
                    schematics: {
                        '@schematics/angular:component': {
                            style: 'css'
                        }
                    },
                    root: '',
                    sourceRoot: 'src',
                    prefix: 'app'
                }
            }
        };
        await FsUtilities.createFile(mockConstants.ANGULAR_JSON, JsonUtilities.stringify(data));
    }

    static async createPackageJson(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ROOT_PACKAGE_JSON, [
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

    static async createAppComponentTsFile(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_COMPONENT_TS, [
            'import { Component } from \'@angular/core\';',
            'import { RouterOutlet } from \'@angular/router\';',
            '',
            '@Component({',
            '\tselector: \'app-root\',',
            '\tstandalone: true,',
            '\timports: [RouterOutlet],',
            '\ttemplateUrl: \'./app.component.html\',',
            '\tstyleUrl: \'./app.component.css\'',
            '})',
            'export class AppComponent {}'
        ], true, false);
    }

    static async createAppComponentHtmlFile(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_COMPONENT_HTML, [''], true, false);
    }

    static async createAppRoutesTs(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_APP_ROUTES_TS, [
            'import { Routes } from \'@angular/router\';',
            '',
            'export const routes: Routes = [];'
        ], true, false);
    }

    static async createAppConfig(mockConstants: MockConstants): Promise<void> {
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

    static async clearTemp(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.rm(mockConstants.PROJECT_DIR);
        await FsUtilities.mkdir(mockConstants.ANGULAR_APP_DIR, true, false);
        await FsUtilities.mkdir(mockConstants.TS_LIBRARY_DIR, true, false);
        CPUtilities['cwd'] = mockConstants.PROJECT_DIR;
    }
}