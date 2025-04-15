/* eslint-disable jsdoc/require-jsdoc */
import { MockConstants, FileMockConstants, DirMockConstants } from './constants';
import { AngularJson } from '../../angular';
import { CPUtilities, FsUtilities, JsonUtilities } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { WorkspaceUtilities } from '../../workspace';

export abstract class FileMockUtilities {

    private static readonly mockMethodForFile: Record<
        keyof FileMockConstants,
        (mockConstants: MockConstants, entry: keyof MockConstants) => (void | Promise<void>)
    > = {
            DOCKER_COMPOSE_YAML: this.createEmptyFile,
            DEV_DOCKER_COMPOSE_YAML: this.createEmptyFile,
            LOCAL_DOCKER_COMPOSE_YAML: this.createEmptyFile,
            ANGULAR_ESLINT_CONFIG_MJS: this.createEmptyFile,
            ANGULAR_PACKAGE_JSON: this.createAngularPackageJson,
            ANGULAR_APP_COMPONENT_TS: this.createAppComponentTsFile,
            ANGULAR_APP_COMPONENT_HTML: this.createEmptyFile,
            ANGULAR_APP_ROUTES_TS: this.createAppRoutesTs,
            ANGULAR_ROUTES_TS: this.createEmptyFile,
            ANGULAR_APP_CONFIG_TS: this.createAppConfig,
            ANGULAR_JSON: this.createAngularJson,
            ANGULAR_ENVIRONMENT_MODEL: this.createEmptyFile,
            ANGULAR_ENVIRONMENT: this.createEmptyFile,
            TS_LIBRARY_PACKAGE_JSON: this.createEmptyFile,
            ROOT_PACKAGE_JSON: this.createRootPackageJson,
            ENV: this.createEmptyFile,
            GLOBAL_ENV_MODEL: this.createGlobalEnvModel
        };

    static async setup(
        mockConstants: MockConstants,
        filesToMock: (keyof FileMockConstants)[] = [],
        contentOverrides: Partial<Record<keyof FileMockConstants, string | string[]>> = {}
    ): Promise<void> {
        await FsUtilities.rm(mockConstants.PROJECT_DIR);
        CPUtilities['cwd'] = mockConstants.PROJECT_DIR;
        await this.mockFolders(mockConstants);
        await this.mockFiles(filesToMock, contentOverrides, mockConstants);
        await WorkspaceUtilities.createConfig();
    }

    private static async mockFolders(mockConstants: MockConstants): Promise<void> {
        const dirMockConstants: DirMockConstants = {
            ANGULAR_APP_DIR: mockConstants.ANGULAR_APP_DIR,
            APPS_DIR: mockConstants.APPS_DIR,
            LIBS_DIR: mockConstants.LIBS_DIR,
            PROJECT_DIR: mockConstants.PROJECT_DIR,
            TS_LIBRARY_DIR: mockConstants.TS_LIBRARY_DIR,
            GITHUB_WORKFLOW_DIR: mockConstants.GITHUB_WORKFLOW_DIR
        };
        for (const entry of Object.values(dirMockConstants)) {
            await FsUtilities.mkdir(entry, true, false);
        }
    }

    private static async mockFiles(
        filesToMock: (keyof FileMockConstants)[],
        contentOverrides: Partial<Record<keyof FileMockConstants, string | string[]>>,
        mockConstants: MockConstants
    ): Promise<void> {
        for (const entry of filesToMock) {
            const hasContentOverride: boolean = Object.keys(contentOverrides).includes(entry);
            const content: string | string[] | undefined = hasContentOverride
                ? contentOverrides[entry]
                : undefined;
            await this.mockFile(mockConstants, entry, hasContentOverride, content);
        }
    }

    private static async mockFile(
        mockConstants: MockConstants,
        entry: keyof FileMockConstants,
        hasContentOverride: boolean,
        content: string | string[] | undefined
    ): Promise<void> {
        if (hasContentOverride) {
            await FsUtilities.createFile(mockConstants[entry], content ?? '', true, false);
            return;
        }
        await this.mockMethodForFile[entry](mockConstants, entry);
    }

    private static async createEmptyFile(mockConstants: MockConstants, entry: keyof MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants[entry], '', true, false);
    }

    private static async createAngularJson(mockConstants: MockConstants): Promise<void> {
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

    private static async createAngularPackageJson(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_PACKAGE_JSON, '{}', true, false);
    }

    private static async createRootPackageJson(mockConstants: MockConstants): Promise<void> {
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

    private static async createAppComponentTsFile(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_APP_COMPONENT_TS, [
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

    private static async createAppRoutesTs(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(mockConstants.ANGULAR_APP_ROUTES_TS, [
            'import { Routes } from \'@angular/router\';',
            '',
            'export const routes: Routes = [];'
        ], true, false);
    }

    private static async createAppConfig(mockConstants: MockConstants): Promise<void> {
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

    private static async createGlobalEnvModel(): Promise<void> {
        await EnvUtilities['createGlobalEnvironmentModel']();
    }
}