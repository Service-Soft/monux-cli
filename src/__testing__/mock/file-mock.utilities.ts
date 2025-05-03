/* eslint-disable jsdoc/require-jsdoc */
import { MockConstants, FileMockConstants, DirMockConstants } from './constants';
import { AngularJson } from '../../angular';
import { CPUtilities, FsUtilities, JsonUtilities } from '../../encapsulation';
import { EnvUtilities } from '../../env';
import { TsConfigUtilities } from '../../tsconfig';
import { getPath } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';

export const defaultFilesToMock: (keyof FileMockConstants)[] = [
    'WORKSPACE_JSON',
    'BASE_TS_CONFIG_JSON',
    'ENV',
    'ENV_PUBLIC',
    'GLOBAL_ENV_MODEL',
    'ROOT_PACKAGE_JSON',
    'DOCKER_COMPOSE_YAML',
    'DEV_DOCKER_COMPOSE_YAML',
    'LOCAL_DOCKER_COMPOSE_YAML',
    'STAGE_DOCKER_COMPOSE_YAML'
] as const;

export const defaultFoldersToMock: (keyof DirMockConstants)[] = [
    'LIBS_DIR',
    'APPS_DIR',
    'PROJECT_DIR'
] as const;

export abstract class FileMockUtilities {

    private static readonly mockMethodForFile: Record<
        keyof FileMockConstants,
        (mockConstants: MockConstants, entry: keyof MockConstants) => (void | Promise<void>)
    > = {
            DOCKER_COMPOSE_YAML: this.createEmptyFile,
            DEV_DOCKER_COMPOSE_YAML: this.createEmptyFile,
            LOCAL_DOCKER_COMPOSE_YAML: this.createEmptyFile,
            STAGE_DOCKER_COMPOSE_YAML: this.createEmptyFile,
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
            ENV: this.createEnv,
            ENV_PUBLIC: this.createEnvPublic,
            GLOBAL_ENV_MODEL: this.createGlobalEnvModel,
            WORKSPACE_JSON: WorkspaceUtilities.createConfig,
            BASE_TS_CONFIG_JSON: TsConfigUtilities.createBaseTsConfig
        };

    static async setup(
        mockConstants: MockConstants,
        filesToMock: (keyof FileMockConstants)[] = defaultFilesToMock,
        contentOverrides: Partial<Record<keyof FileMockConstants, string | string[]>> = {},
        foldersToMock: (keyof DirMockConstants)[] = defaultFoldersToMock
    ): Promise<void> {
        await FsUtilities.rm(mockConstants.PROJECT_DIR);
        CPUtilities['cwd'] = mockConstants.PROJECT_DIR;
        await this.mockFolders(foldersToMock, mockConstants);
        await this.mockFiles(filesToMock, contentOverrides, mockConstants);
    }

    private static async mockFolders(foldersToMock: (keyof DirMockConstants)[], mockConstants: MockConstants): Promise<void> {
        for (const entry of foldersToMock) {
            await FsUtilities.mkdir(mockConstants[entry], true, false);
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
            await FsUtilities.createFile(getPath(mockConstants[entry]), content ?? '', true, false);
            return;
        }
        await this.mockMethodForFile[entry](mockConstants, entry);
    }

    private static async createEmptyFile(mockConstants: MockConstants, entry: keyof MockConstants): Promise<void> {
        await FsUtilities.createFile(getPath(mockConstants[entry]), '', true, false);
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
            '    "name": "sandbox",',
            '    "version": "1.0.0",',
            '    "main": "index.js",',
            '    "scripts": {',
            '        "test": "echo \\\"Error: no test specified\\\" && exit 1"',
            '    },',
            '    "keywords": [],',
            '    "author": "",',
            '    "license": "ISC",',
            '    "description": "",',
            '    "devDependencies": {',
            '        "autoprefixer": "^10.4.21",',
            '        "eslint": "^9.25.1",',
            '        "eslint-config-service-soft": "^2.0.8",',
            '        "postcss": "^8.5.3",',
            '        "tailwindcss": "^4.1.4"',
            '    },',
            '    "workspaces": [',
            '        "apps/*",',
            '        "libs/*"',
            '    ]',
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

    private static async createEnv(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(
            mockConstants.ENV,
            ['basic_auth_user=user', 'basic_auth_password=password']
        );
    }

    private static async createEnvPublic(mockConstants: MockConstants): Promise<void> {
        await FsUtilities.createFile(
            mockConstants.ENV_PUBLIC,
            ['prod_root_domain=test.com', 'stage_root_domain=test-staging.com']
        );
    }
}