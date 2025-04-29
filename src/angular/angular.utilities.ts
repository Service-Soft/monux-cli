
import { Provider, EnvironmentProviders } from '@angular/core';
import { NavbarRow, NavRoute } from 'ngx-material-navigation';

import { CPUtilities, CustomTsValues, FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { NpmPackage, NpmUtilities } from '../npm';
import { ArrayStartIdentifier, TsImportDefinition, TsUtilities } from '../ts';
import { AngularJson, AngularJsonAssetPattern } from './angular-json.model';
import { NgPackageJson } from './ng-package-json.model';
import { ANGULAR_APP_COMPONENT_FILE_NAME, ANGULAR_JSON_FILE_NAME, ANGULAR_ROUTES_FILE_NAME, APP_CONFIG_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { DeepPartial } from '../types';
import { AddNavElementConfig } from './add-nav-element-config.model';
import { getPath, mergeDeep, optionsToCliString, Path } from '../utilities';
import { NavElementTypes } from './nav-element-types.enum';
import { RobotsUtilities } from '../robots';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';
import { adminsPageTsContent, getAdminModelContent, getAdminServiceContent, baseEntityModelContent, changeSetServiceContent, changeSetsComponentHtmlContent, changeSetsComponentTsContent, lodashUtilitiesContent } from './content';
import { authServiceContent } from './content/auth-service.content';
import { offlineServiceContent } from './content/offline-service.content';

/**
 * The `ng new {}` command.
 */
type CliNew = `new ${string}`;

/**
 * The `ng generate {component} {}` command.
 */
type CliGenerate = `generate ${string} ${string}`;

/**
 * The `ng add {}` command.
 */
type CliAdd = `add ${string}`;

/**
 * All possible angular cli commands.
 */
type AngularCliCommands = CliNew | CliGenerate | CliAdd;

/**
 * Cli Options for running ng new.
 */
type NewOptions = {
    /**
     * Whether or not git initialization should be skipped.
     */
    '--skip-git'?: boolean,
    /**
     * Whether or not creating a application should be skipped.
     */
    '--no-create-application'?: boolean,
    /**
     * Which stylesheets to use.
     */
    '--style'?: 'css',
    /**
     * Whether or not to use ssr.
     */
    '--ssr'?: boolean,
    /**
     * Whether or not to use inline styles instead of a whole css file for each component.
     */
    '--inline-style'?: boolean
};

/**
 * Cli Options for running ng generate.
 */
type GenerateOptions = {
    /**
     * Whether or not generating tests should be skipped.
     */
    '--skip-tests'?: boolean,
    /**
     * Whether or not to use inline styles instead of a whole css file for each component.
     */
    '--inline-style'?: boolean
};

/**
 * Cli Options for running ng add.
 */
type AddOptions = {
    /**
     * Whether or not to skip confirmation by the user.
     */
    '--skip-confirmation'?: boolean
};

/**
 * Possible angular cli options, narrowed down based on the provided command.
 */
type AngularCliOptions<T extends AngularCliCommands> =
    T extends CliNew ? NewOptions
        : T extends CliGenerate ? GenerateOptions
            : T extends CliAdd ? AddOptions
                : never;

/**
 * Utilities for angular specific code generation/manipulation.
 */
export abstract class AngularUtilities {

    private static readonly CLI_VERSION: number = 18;

    /**
     * Sets up logging.
     * @param root - The project root.
     * @param name - Name of the project.
     * @param apiName - Name of the api where the logging endpoint is.
     */
    static async setupLogging(root: string, name: string, apiName: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_PERSISTENCE_LOGGER]);
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'services', 'logger.service.ts'),
            [
                'import { HttpClient } from \'@angular/common/http\';',
                'import { Injectable } from \'@angular/core\';',
                'import { BaseLoggerService } from \'ngx-persistence-logger\';',
                'import { environment } from \'../../environment/environment\';',
                '',
                '@Injectable({ providedIn: \'root\' })',
                'export class LoggerService extends BaseLoggerService {',
                `\tprotected override readonly LOG_URL: string = \`\${environment.${DefaultEnvKeys.baseUrl(apiName)}}/logs\`;`,
                `\tprotected override readonly APPLICATION_NAME: string = '${name}';`,
                '',
                '\tconstructor(http: HttpClient) {',
                '\t\tsuper(http);',
                '\t}',
                '}'
            ]
        );
        const appComponentPath: Path = getPath(root, 'src', 'app', ANGULAR_APP_COMPONENT_FILE_NAME);
        await TsUtilities.addImportStatements(
            appComponentPath,
            [{ defaultImport: false, element: 'LoggerService', path: './services/logger.service' }]
        );
        await TsUtilities.addBelowImports(appComponentPath, ['export let logger: LoggerService;']);
        await FsUtilities.replaceInFile(appComponentPath, 'AppComponent {', 'AppComponent {\n\n    constructor() {}\n');
        await TsUtilities.addToConstructorHeader(appComponentPath, 'loggerService: LoggerService');
        await TsUtilities.addToConstructorBody(appComponentPath, 'logger = loggerService;');
        await this.addProvider(
            root,
            { provide: 'NGX_LOGGER_SERVICE', useExisting: 'LoggerService' },
            [
                { defaultImport: false, element: 'NGX_LOGGER_SERVICE', path: NpmPackage.NGX_PERSISTENCE_LOGGER },
                { defaultImport: false, element: 'LoggerService', path: './services/logger.service' }
            ]
        );
        await this.addProvider(
            root,
            // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
            { provide: 'ErrorHandler', useClass: 'GlobalErrorHandler' as any },
            [{ defaultImport: false, element: 'GlobalErrorHandler', path: NpmPackage.NGX_PERSISTENCE_LOGGER }]
        );
    }

    /**
     * Sets up auth.
     * @param projectRoot - The root of the project.
     * @param name - Name of the project.
     * @param apiName - The name of the api that the angular project should use.
     * @param domain - The production domain of the project.
     * @param titleSuffix - The suffix after the title.
     */
    static async setupAuth(
        projectRoot: Path,
        name: string,
        apiName: string,
        domain: string,
        titleSuffix: string
    ): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_MATERIAL_AUTH]);
        await EnvUtilities.addProjectVariableKey(
            name,
            getPath(projectRoot, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
            DefaultEnvKeys.baseUrl(apiName),
            false,
            getPath('.')
        );
        await EnvUtilities.addProjectVariableKey(
            name,
            getPath(projectRoot, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
            DefaultEnvKeys.domain(apiName),
            false,
            getPath('.')
        );
        const authServicePath: Path = getPath(projectRoot, 'src', 'app', 'services', 'auth.service.ts');
        await FsUtilities.createFile(authServicePath, authServiceContent);
        await this.addProvider(
            projectRoot,
            { provide: 'NGX_AUTH_SERVICE', useExisting: 'AuthService' },
            [
                { defaultImport: false, element: 'NGX_AUTH_SERVICE', path: NpmPackage.NGX_MATERIAL_AUTH },
                { defaultImport: false, element: 'AuthService', path: './services/auth.service' }
            ]
        );
        await this.addProvider(
            projectRoot,
            { provide: 'NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS', useValue: ['ALLOWED_DOMAINS_PLACEHOLDER'] },
            [
                { defaultImport: false, element: 'NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS', path: NpmPackage.NGX_MATERIAL_AUTH },
                { defaultImport: false, element: 'environment', path: '../environment/environment' }
            ]
        );
        const appConfigPath: Path = getPath(projectRoot, 'src', 'app', APP_CONFIG_FILE_NAME);
        await TsUtilities.addImportStatements(
            appConfigPath,
            [
                { defaultImport: false, element: 'HTTP_INTERCEPTORS', path: '@angular/common/http' },
                { defaultImport: false, element: 'ErrorHandler', path: '@angular/core' }
            ]
        );
        await this.addProvider(
            projectRoot,
            // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
            { provide: 'HTTP_INTERCEPTORS', useClass: 'JwtInterceptor' as any, multi: true },
            [{ defaultImport: false, element: 'JwtInterceptor', path: NpmPackage.NGX_MATERIAL_AUTH }]
        );
        await this.addProvider(
            projectRoot,
            // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
            { provide: 'HTTP_INTERCEPTORS', useClass: 'HttpErrorInterceptor' as any, multi: true },
            [{ defaultImport: false, element: 'HttpErrorInterceptor', path: NpmPackage.NGX_MATERIAL_AUTH }]
        );

        await TsUtilities.addImportStatements(
            getPath(projectRoot, 'src', 'app', ANGULAR_ROUTES_FILE_NAME),
            [
                { defaultImport: false, element: 'JwtNotLoggedInGuard', path: NpmPackage.NGX_MATERIAL_AUTH },
                { defaultImport: false, element: 'JwtLoggedInGuard', path: NpmPackage.NGX_MATERIAL_AUTH }
            ]
        );
        await this.generatePage(
            projectRoot,
            'Login',
            {
                addTo: 'array',
                element: {
                    path: 'login',
                    title: `Login ${titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
                    canActivate: ['JwtNotLoggedInGuard']
                }
            },
            domain
        );
        const pagesPath: Path = getPath(projectRoot, 'src', 'app', 'pages');
        const loginPageTs: Path = getPath(pagesPath, 'login', 'login.component.ts');
        const loginPageHtml: Path = getPath(pagesPath, 'login', 'login.component.html');
        await this.addComponentImports(
            loginPageTs,
            [{ defaultImport: false, element: 'NgxMatAuthLoginComponent', path: NpmPackage.NGX_MATERIAL_AUTH }]
        );
        await FsUtilities.updateFile(
            loginPageHtml,
            [
                // eslint-disable-next-line sonar/no-duplicate-string
                '<div class="flex items-center justify-center h-screen w-screen">',
                '\t<ngx-mat-auth-login></ngx-mat-auth-login>',
                '<div>'
            ],
            'replace'
        );

        await this.generatePage(
            projectRoot,
            'RequestResetPassword',
            {
                addTo: 'array',
                element: {
                    // eslint-disable-next-line sonar/no-duplicate-string
                    path: 'request-reset-password',
                    title: `Reset Password ${titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line stylistic/max-len, typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/request-reset-password/request-reset-password.component').then(m => m.RequestResetPasswordComponent),
                    canActivate: ['JwtNotLoggedInGuard']
                }
            },
            domain
        );
        const requestResetPasswordPageTs: Path = getPath(pagesPath, 'request-reset-password', 'request-reset-password.component.ts');

        const requestResetPasswordPageHtml: Path = getPath(pagesPath, 'request-reset-password', 'request-reset-password.component.html');
        await this.addComponentImports(
            requestResetPasswordPageTs,
            [{ defaultImport: false, element: 'NgxMatAuthRequestResetPasswordComponent', path: NpmPackage.NGX_MATERIAL_AUTH }]
        );
        await FsUtilities.updateFile(
            requestResetPasswordPageHtml,
            [
                '<div class="flex items-center justify-center h-screen w-screen">',
                '\t<ngx-mat-auth-request-reset-password></ngx-mat-auth-request-reset-password>',
                '<div>'
            ],
            'replace'
        );

        await this.generatePage(
            projectRoot,
            'ConfirmResetPassword',
            {
                addTo: 'array',
                element: {
                    path: 'confirm-reset-password/:token',
                    title: `Confirm Reset Password ${titleSuffix}`,
                    // @ts-ignore
                    // eslint-disable-next-line stylistic/max-len, typescript/no-unsafe-return, typescript/no-unsafe-member-access
                    loadComponent: () => import('./pages/confirm-reset-password/confirm-reset-password.component').then(m => m.ConfirmResetPasswordComponent),
                    canActivate: ['JwtNotLoggedInGuard']
                }
            },
            domain
        );
        const confirmResetPasswordPageTs: Path = getPath(pagesPath, 'confirm-reset-password', 'confirm-reset-password.component.ts');

        const confirmResetPasswordPageHtml: Path = getPath(pagesPath, 'confirm-reset-password', 'confirm-reset-password.component.html');
        await this.addComponentImports(
            confirmResetPasswordPageTs,
            [{ defaultImport: false, element: 'NgxMatAuthConfirmResetPasswordComponent', path: NpmPackage.NGX_MATERIAL_AUTH }]
        );
        await FsUtilities.updateFile(
            confirmResetPasswordPageHtml,
            [
                '<div class="flex items-center justify-center h-screen w-screen">',
                '\t<ngx-mat-auth-confirm-reset-password></ngx-mat-auth-confirm-reset-password>',
                '<div>'
            ],
            'replace'
        );

        await this.generatePage(
            projectRoot,
            'Admins',
            {
                addTo: 'navbar',
                rowIndex: 0,
                element: {
                    type: NavElementTypes.INTERNAL_LINK,
                    name: 'Admins',
                    route: {
                        path: 'admins',
                        title: `Admins ${titleSuffix}`,
                        // @ts-ignore
                        // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-member-access
                        loadComponent: () => import('./pages/admins/admins.component').then(m => m.AdminsComponent),
                        canActivate: ['JwtLoggedInGuard']
                    },
                    position: 'center',
                    // @ts-ignore
                    condition: 'isLoggedIn'
                }
            },
            domain
        );
        const adminsPageTs: Path = getPath(pagesPath, 'admins', 'admins.component.ts');
        const adminsPageHtml: Path = getPath(pagesPath, 'admins', 'admins.component.html');
        await FsUtilities.updateFile(
            adminsPageTs,
            adminsPageTsContent,
            'replace'
        );
        await FsUtilities.updateFile(
            adminsPageHtml,
            [
                '<div class="container mx-auto p-6">',
                '\t<ngx-mat-entity-table [tableData]="tableConfig"></ngx-mat-entity-table>',
                '<div>'
            ],
            'replace'
        );
        const routesTs: Path = getPath(projectRoot, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);
        await TsUtilities.addImportStatements(
            routesTs,
            [
                { defaultImport: false, element: 'AuthService', path: './services/auth.service' },
                { defaultImport: false, element: 'inject', path: '@angular/core' }
            ]
        );
        await FsUtilities.updateFile(
            routesTs,
            [
                'function isLoggedIn(): boolean {',
                '    return !!inject(AuthService).authData;',
                '}'
            ],
            'append'
        );
    }

    /**
     * Sets up change sets.
     * @param root - The root path of the project.
     * @param name - Name of the project.
     * @param apiName - The name of the api.
     */
    static async setupChangeSets(root: string, name: string, apiName: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_MATERIAL_CHANGE_SETS]);
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'services', 'change-set.service.ts'),
            changeSetServiceContent
        );
        await this.addProvider(
            root,
            { provide: 'NGX_CHANGE_SET_SERVICE', useExisting: 'ChangeSetService' },
            [
                { defaultImport: false, element: 'ChangeSetService', path: './services/change-set.service' },
                { defaultImport: false, element: 'NGX_CHANGE_SET_SERVICE', path: NpmPackage.NGX_MATERIAL_CHANGE_SETS }
            ]
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'services', 'entities', 'admin.service.ts'),
            getAdminServiceContent(apiName)
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'models', 'admin.model.ts'),
            getAdminModelContent(apiName)
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'models', 'roles.enum.ts'),
            [
                'export enum Roles {',
                '\tADMIN = \'ADMIN\'',
                '}'
            ]
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'models', 'base-entity.model.ts'),
            baseEntityModelContent
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'components', 'change-sets-input', 'change-sets-input.component.ts'),
            changeSetsComponentTsContent
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'components', 'change-sets-input', 'change-sets-input.component.html'),
            changeSetsComponentHtmlContent
        );
        await NpmUtilities.install(name, [NpmPackage.LODASH]);
        await NpmUtilities.install(name, [NpmPackage.LODASH_TYPES], true);
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'utilities', 'lodash.utilities.ts'),
            lodashUtilitiesContent
        );
    }

    /**
     * Sets up  angular material in the project with the provided root.
     * @param root - The root of the angular project to setup material for.
     */
    static async setupMaterial(root: string): Promise<void> {
        await Promise.all([
            this.addProvider(
                root,
                'provideAnimations()',
                [{ defaultImport: false, element: 'provideAnimations', path: '@angular/platform-browser/animations' }]
            ),
            FsUtilities.updateFile(getPath(root, 'src', 'styles.css'), [
                '@import "@angular/material/prebuilt-themes/indigo-pink.css";',
                '',
                'html,',
                'body {',
                '\theight: 100%;',
                '\tscroll-behavior: smooth;',
                '}',
                '',
                'body {',
                '\tmargin: 0;',
                '\tfont-family: Arial, Helvetica, sans-serif;',
                '}'
            ], 'append')
        ]);
    }

    /**
     * Adds a provider to the app config array.
     * @param root - The root of the angular project where the provider should be added.
     * @param provider - The definition of the provider.
     * @param imports - The imports to add.
     */
    static async addProvider(
        root: string,
        provider: Provider | EnvironmentProviders | CustomTsValues,
        imports: TsImportDefinition[]
    ): Promise<void> {
        const appConfigPath: Path = getPath(root, 'src', 'app', APP_CONFIG_FILE_NAME);

        const { result, contentString } = await TsUtilities.getArrayStartingWith(appConfigPath, 'providers: [');

        result.push(provider);

        const stringifiedArray: string = ` ${JsonUtilities.stringifyAsTs(result, 4)}`;

        await FsUtilities.replaceInFile(
            appConfigPath,
            contentString,
            stringifiedArray
        );
        await TsUtilities.addImportStatements(
            appConfigPath,
            imports
        );
    }

    /**
     * Runs an angular cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static runCommand(directory: Path, command: AngularCliCommands, options: AngularCliOptions<typeof command>): void {
        CPUtilities.execSync(`cd ${directory} && npx @angular/cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options)}`);
    }

    /**
     * Generates a new page inside the project at root.
     * @param root - The root of the angular project to add the page to.
     * @param pageName - The name of the new page.
     * @param navElement - Optional definition for a navigation element.
     * @param domain - The domain of the project.
     */
    static async generatePage(
        root: Path,
        pageName: string,
        navElement: AddNavElementConfig | undefined,
        domain: string | undefined
    ): Promise<void> {
        this.runCommand(root, `generate component pages/${pageName}`, { '--skip-tests': true, '--inline-style': true });

        if (navElement) {
            await this.addNavElement(root, navElement);
        }

        const sitemapPath: Path = getPath(root, 'src', SITEMAP_FILE_NAME);
        const route: string | undefined = this.resolveInternalRoute(navElement);
        if (
            domain
            && route != undefined
            && await FsUtilities.exists(sitemapPath)
            && !(await FsUtilities.readFile(sitemapPath)).includes(`<loc>https://${domain}/${route}</loc>`)
        ) {
            await FsUtilities.replaceAllInFile(
                sitemapPath,
                '</urlset>',
                `\t<url>\n\t\t<loc>https://${domain}/${route}</loc>\n\t</url>\n</urlset>`
            );
        }
    }

    private static resolveInternalRoute(navElement: AddNavElementConfig | undefined): string | undefined {
        if (!navElement?.element) {
            return;
        }
        if (navElement.addTo === 'array') {
            return navElement.element.path;
        }
        // eslint-disable-next-line typescript/switch-exhaustiveness-check
        switch (navElement?.element.type) {
            case NavElementTypes.TITLE_WITH_INTERNAL_LINK: {
                return typeof navElement.element.link.route === 'string' ? undefined : navElement.element.link.route.path;
            }
            case NavElementTypes.INTERNAL_LINK: {
                return typeof navElement.element.route === 'string' ? undefined : navElement.element.route.path;
            }
            default: {
                throw new Error('Could not determine internal route from nav element');
            }
        }
    }

    private static async addNavElement(projectPath: string, element: AddNavElementConfig): Promise<void> {
        const routesPath: Path = getPath(projectPath, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);

        const startIdentifier: ArrayStartIdentifier = this.getStartIdentifierForAddingNavElement(element);
        const { result, contentString } = await TsUtilities.getArrayStartingWith<typeof element.element>(routesPath, startIdentifier);

        if (element.addTo === 'array') {
            result.unshift(element.element);
        }
        else {
            (result as NavbarRow<NavRoute>[])[element.rowIndex].elements.push(element.element);
        }

        const stringifiedArray: string = ` ${JsonUtilities.stringifyAsTs(result)}${element.addTo === 'array' ? ');' : ';'}`;

        const startIndex: number = (await FsUtilities.findLineWithContent(routesPath, startIdentifier)).index;
        await FsUtilities.replaceInFile(
            routesPath,
            contentString,
            stringifiedArray,
            startIndex
        );
    }

    private static getStartIdentifierForAddingNavElement(element: AddNavElementConfig): ArrayStartIdentifier {
        switch (element.addTo) {
            case 'navbar': {
                return ': NavbarRow<NavRoute>[] = [';
            }
            case 'footer': {
                return ': FooterRow[] = [';
            }
            case 'array': {
                return 'NavUtilities.getAngularRoutes(navbarRows, footerRows, [';
            }
        }
    }

    /**
     * Adds tracking to the angular project with the given name.
     * @param projectName - The name of the angular project to add tracking to.
     */
    static async setupTracking(projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds tracking');
        await NpmUtilities.install(projectName, [NpmPackage.NGX_MATERIAL_TRACKING]);
        // TODO: Angular Tracking
    }

    /**
     * Adds a sitemap.xml and a robots.txt to a project at the given path.
     * @param root - The root of the angular project to add the files to.
     * @param projectName - The name of the project.
     * @param domain - The domain of the project. Is needed to create the robots.txt file when the baseUrl environment variable has not been set yet.
     */
    static async addSitemapAndRobots(root: string, projectName: string, domain: string): Promise<void> {
        const app: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(projectName, getPath('.'));
        await RobotsUtilities.createRobotsTxtForApp(app, 'dev.docker-compose.yaml', domain, getPath('.'));
        await FsUtilities.createFile(getPath(root, 'src', SITEMAP_FILE_NAME), [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
            '</urlset>'
        ]);

        const angularJsonPath: Path = getPath(root, ANGULAR_JSON_FILE_NAME);
        const currentAngularJson: AngularJson = await FsUtilities.parseFileAs(angularJsonPath);
        // eslint-disable-next-line stylistic/max-len
        const currentAssets: AngularJsonAssetPattern[] = currentAngularJson?.projects[projectName]?.architect?.['build'].options?.assets ?? [];
        await this.updateAngularJson(angularJsonPath, {
            projects: {
                [projectName]: {
                    architect: {
                        ['build']: {
                            options: {
                                assets: [
                                    ...currentAssets,
                                    `src/${SITEMAP_FILE_NAME}`,
                                    `src/${ROBOTS_FILE_NAME}`
                                ]
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Install and setup ngx-material-navigation.
     * @param root - The directory of the angular project to setup the navigation for.
     * @param name - The name of the angular project to setup the navigation for.
     */
    static async setupNavigation(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds navigation');

        await NpmUtilities.install(name, [NpmPackage.NGX_MATERIAL_NAVIGATION]);
        await FsUtilities.updateFile(
            getPath(root, 'src', 'app', 'app.component.html'),
            [
                // eslint-disable-next-line stylistic/max-len
                '<ngx-mat-navigation-navbar [minHeight]="80" [minSidenavWidth]="\'30%\'" [minHeightOtherElements]="70" [navbarRows]="navbarRows">',
                '\t<router-outlet></router-outlet>',
                '</ngx-mat-navigation-navbar>',
                '',
                '<ngx-mat-navigation-footer [minHeight]="70" [footerRows]="footerRows"></ngx-mat-navigation-footer>'
            ],
            'append'
        );
        const appComponentTs: Path = getPath(root, 'src', 'app', ANGULAR_APP_COMPONENT_FILE_NAME);
        await this.addComponentImports(
            appComponentTs,
            [
                {
                    element: 'NgxMatNavigationNavbarComponent',
                    path: NpmPackage.NGX_MATERIAL_NAVIGATION,
                    defaultImport: false
                },
                {
                    element: 'NgxMatNavigationFooterComponent',
                    path: NpmPackage.NGX_MATERIAL_NAVIGATION,
                    defaultImport: false
                }
            ]
        );
        await TsUtilities.addImportStatements(appComponentTs, [
            {
                element: 'footerRows',
                path: './routes',
                defaultImport: false
            },
            {
                element: 'navbarRows',
                path: './routes',
                defaultImport: false
            },
            {
                element: 'NavbarRow',
                path: NpmPackage.NGX_MATERIAL_NAVIGATION,
                defaultImport: false
            },
            {
                element: 'FooterRow',
                path: NpmPackage.NGX_MATERIAL_NAVIGATION,
                defaultImport: false
            }
        ]);

        const tsLines: string[] = await FsUtilities.readFileLines(appComponentTs);
        const componentLine: FileLine = await this.getComponentImportLine(tsLines);
        const classLine: FileLine = await FsUtilities.findLineWithContent(tsLines, '{', componentLine.index);
        const isLastLine: boolean = classLine.index === tsLines.length - 1;
        const content: string = isLastLine ? classLine.content.split('}')[0] : classLine.content;
        tsLines[classLine.index] = `${content}\n\tnavbarRows: NavbarRow[] = navbarRows;\n\tfooterRows: FooterRow[] = footerRows;`;
        if (isLastLine) {
            tsLines.push('}');
        }
        await FsUtilities.updateFile(appComponentTs, tsLines, 'replace');

        const routesTs: Path = getPath(root, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);
        await FsUtilities.rename(
            getPath(root, 'src', 'app', 'app.routes.ts'),
            routesTs
        );
        await FsUtilities.replaceAllInFile(
            getPath(root, 'src', 'app', APP_CONFIG_FILE_NAME),
            'import { routes } from \'./app.routes\';',
            'import { routes } from \'./routes\';'
        );
        await FsUtilities.updateFile(
            routesTs,
            [
                // eslint-disable-next-line stylistic/max-len
                'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation\';',
                '',
                'export const navbarRows: NavbarRow<NavRoute>[] = [',
                '\t{',
                '\t\telements: []',
                '\t}',
                '];',
                '',
                'export const footerRows: FooterRow[] = [',
                '\t{',
                '\t\telements: []',
                '\t}',
                '];',
                '',
                'const notFoundRoute: NavRoute = {',
                '\ttitle: \'Page not found\',',
                '\tpath: \'**\',',
                '\tcomponent: NgxMatNavigationNotFoundComponent,',
                '\tdata: {',
                '\t\tpageNotFoundConfig: {',
                '\t\t\thomeRoute: \'\',',
                '\t\t\ttitle: \'Page not found\',',
                // eslint-disable-next-line stylistic/max-len
                '\t\t\tmessage: \'The page you are looking for might have been removed, had its name changed or is temporarily unavailable.\',',
                '\t\t\tbuttonLabel: \'Homepage\'',
                '\t\t}',
                '\t}',
                '};',
                '',
                'export const routes: NavRoute[] = NavUtilities.getAngularRoutes(navbarRows, footerRows, [notFoundRoute]);'
            ],
            'replace'
        );

        await FsUtilities.mkdir(getPath(root, 'src', 'app', 'pages'));
    }

    /**
     * Install and setup ngx-pwa.
     * @param root - The directory of the angular project to setup the pwa support for.
     * @param name - The name of the angular project to setup the pwa support for.
     */
    static async setupPwa(root: Path, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds pwa support');
        await this.addProvider(
            root,
            { provide: 'NGX_PWA_OFFLINE_SERVICE', useExisting: 'OfflineService' as unknown },
            [
                { defaultImport: false, element: 'NGX_PWA_OFFLINE_SERVICE', path: NpmPackage.NGX_PWA },
                { defaultImport: false, element: 'OfflineService', path: './services/offline.service' }
            ]
        );
        await this.addProvider(
            root,
            // eslint-disable-next-line typescript/no-unsafe-assignment, typescript/no-explicit-any
            { provide: 'HTTP_INTERCEPTORS', useClass: 'OfflineRequestInterceptor' as any, multi: true },
            [{ defaultImport: false, element: 'OfflineRequestInterceptor', path: NpmPackage.NGX_PWA }]
        );
        this.runCommand(root, `add @angular/pwa@${this.CLI_VERSION}`, { '--skip-confirmation': true });
        await NpmUtilities.install(name, [NpmPackage.NGX_PWA]);
        await FsUtilities.updateFile(
            getPath(root, 'src', 'app', 'app.component.html'),
            ['<ngx-pwa-offline-status-bar></ngx-pwa-offline-status-bar>'],
            'prepend'
        );
        await this.addComponentImports(
            getPath(root, 'src', 'app', ANGULAR_APP_COMPONENT_FILE_NAME),
            [
                {
                    element: 'NgxPwaOfflineStatusBarComponent',
                    path: 'ngx-pwa',
                    defaultImport: false
                }
            ]
        );
        await FsUtilities.createFile(
            getPath(root, 'src', 'app', 'services', 'offline.service.ts'),
            offlineServiceContent
        );
    }

    /**
     * Updates an angular library ng-package.json.
     * @param path - The path of the ng-package.json.
     * @param data - The data to update with.
     */
    static async updateNgPackageJson(path: Path, data: Partial<NgPackageJson>): Promise<void> {
        const oldData: NgPackageJson = await FsUtilities.parseFileAs(path);
        const updatedData: NgPackageJson = mergeDeep(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(updatedData), 'replace', false);
    }

    /**
     * Updates the angular json file at the given path.
     * @param path - The path of the angular.json.
     * @param data - The data to update with.
     */
    static async updateAngularJson(path: Path, data: DeepPartial<AngularJson>): Promise<void> {
        const oldData: AngularJson = await FsUtilities.parseFileAs(path);
        const newData: AngularJson = mergeDeep<AngularJson>(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(newData), 'replace');
    }

    private static async addComponentImports(componentPath: Path, imports: TsImportDefinition[]): Promise<void> {
        await TsUtilities.addImportStatements(componentPath, imports);
        let lines: string[] = await FsUtilities.readFileLines(componentPath);
        for (const imp of imports) {
            lines = await this.addComponentImport(lines, imp);
        }
        await FsUtilities.updateFile(componentPath, lines, 'replace');
    }

    private static async addComponentImport(lines: string[], imp: TsImportDefinition): Promise<string[]> {
        const l: FileLine = await this.getComponentImportLine(lines);
        if (l.content.includes('imports: []')) {
            l.content = l.content.replace('imports: []', `imports: [${imp.element}]`);
            lines[l.index] = l.content;
            return lines;
        }
        if (l.content.includes(']')) {
            l.content = l.content.replace(']', `, ${imp.element}]`);
            lines[l.index] = l.content;
            return lines;
        }
        const closingArrayLine: FileLine = await FsUtilities.findLineWithContent(lines, ']', l.index);
        lines[closingArrayLine.index - 1] = `${lines[closingArrayLine.index - 1]},\n\t\t${imp.element}`;
        return lines;
    }

    private static async getComponentImportLine(lines: string[]): Promise<FileLine> {
        const componentLine: string | undefined = lines.find(l => l.includes('@Component'));
        if (!componentLine) {
            throw new Error('The file does not contain an @Component decorator');
        }
        return await FsUtilities.findLineWithContent(lines, 'imports:', lines.indexOf(componentLine));
    }
}