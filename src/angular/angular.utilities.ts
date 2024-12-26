import { Dirent } from 'fs';
import path from 'path';

import { Provider, EnvironmentProviders } from '@angular/core';
import type { FooterRow, NavbarRow } from 'ngx-material-navigation';

import { CPUtilities, CustomTsValues, FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { NpmPackage, NpmUtilities } from '../npm';
import { ArrayStartIdentifier, TsImportDefinition, TsUtilities } from '../ts';
import { AngularJson, AngularJsonAssetPattern } from './angular-json.model';
import { NgPackageJson } from './ng-package-json.model';
import { ANGULAR_JSON_FILE_NAME, ANGULAR_ROUTES_FILE_NAME, APP_CONFIG_FILE_NAME, ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { DeepPartial } from '../types';
import { AddNavElementConfig } from './add-nav-element-config.model';
import { mergeDeep, optionsToCliString } from '../utilities';
import { NavElementTypes } from './nav-element-types.enum';
import { RobotsUtilities } from '../robots';
import { WorkspaceUtilities } from '../workspace';

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
    '--create-application'?: boolean,
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
     * @param name - Name of the project.
     */
    static async setupLogger(name: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_PERSISTENCE_LOGGER]);
        // TODO
        // create logger service extends base logger service.
        // provide logger service for NGX_LOGGER_SERVICE
        // add global error handler
    }

    /**
     * Sets up auth.
     * @param name - Name of the project.
     */
    static async setupAuth(name: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_MATERIAL_AUTH]);
        // TODO
        // create auth-service
        // provide the auth service for NGX_AUTH_SERVICE
        // provide the jwt interceptor and http interceptor
        // add login page
        // add forgot-password page
        // add confirm-reset-password page
    }

    /**
     * Sets up change sets.
     * @param name - Name of the project.
     */
    static async setupChangeSets(name: string): Promise<void> {
        await NpmUtilities.install(name, [NpmPackage.NGX_MATERIAL_CHANGE_SETS]);
        // TODO
        // create change-set-service
        // provide the change set service for NGX_CHANGE_SET_SERVICE
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
            FsUtilities.updateFile(path.join(root, 'src', 'styles.css'), [
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

    private static async addProvider(
        root: string,
        provider: Provider | EnvironmentProviders | CustomTsValues,
        imports: TsImportDefinition[]
    ): Promise<void> {
        const appConfigPath: string = path.join(root, 'src', 'app', APP_CONFIG_FILE_NAME);

        const { result, contentString } = await TsUtilities.getArrayStartingWith(appConfigPath, 'providers: [');

        result.push(provider);

        const stringifiedArray: string = ` ${JsonUtilities.stringifyAsTs(result, 4)}`;

        await FsUtilities.replaceInFile(
            appConfigPath,
            contentString,
            stringifiedArray
        );
        await TsUtilities.addImportStatementsToFile(
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
    static runCommand(directory: string, command: AngularCliCommands, options: AngularCliOptions<typeof command>): void {
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
        root: string,
        pageName: string,
        navElement: AddNavElementConfig | undefined,
        domain: string | undefined
    ): Promise<void> {
        this.runCommand(root, `generate component pages/${pageName}`, { '--skip-tests': true, '--inline-style': true });

        if (navElement) {
            await this.addNavElement(root, navElement);
        }

        const sitemapPath: string = path.join(root, 'src', SITEMAP_FILE_NAME);
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
        const routesPath: string = path.join(projectPath, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);

        const startIdentifier: ArrayStartIdentifier = element.addTo === 'navbar' ? ': NavbarRow<NavRoute>[] = [' : ': FooterRow[] = [';
        const { result, contentString } = await TsUtilities.getArrayStartingWith<NavbarRow | FooterRow>(routesPath, startIdentifier);

        result[element.rowIndex].elements.push(element.element);
        const stringifiedArray: string = ` ${JsonUtilities.stringifyAsTs(result)};`;

        const startIndex: number = (await FsUtilities.findLineWithContent(routesPath, startIdentifier)).index;
        await FsUtilities.replaceInFile(
            routesPath,
            contentString,
            stringifiedArray,
            startIndex
        );
    }

    /**
     * Adds tracking to the angular project with the given name.
     * @param projectName - The name of the angular project to add tracking to.
     */
    static async addTracking(projectName: string): Promise<void> {
        throw new Error('Not implemented'); // TODO
        // eslint-disable-next-line no-console
        console.log('Adds tracking');
        await NpmUtilities.install(projectName, [NpmPackage.NGX_MATERIAL_TRACKING]);
    }

    /**
     * Adds a sitemap.xml and a robots.txt to a project at the given path.
     * @param root - The root of the angular project to add the files to.
     * @param projectName - The name of the project.
     * @param domain - The domain of the project.
     */
    static async addSitemapAndRobots(root: string, projectName: string, domain: string): Promise<void> {
        const app: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        await RobotsUtilities.createRobotsTxtForApp(app, domain, true);
        await FsUtilities.createFile(path.join(root, 'src', SITEMAP_FILE_NAME), [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
            '</urlset>'
        ]);

        const angularJsonPath: string = path.join(root, ANGULAR_JSON_FILE_NAME);
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
            path.join(root, 'src', 'app', 'app.component.html'),
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
        const appComponentTs: string = path.join(root, 'src', 'app', 'app.component.ts');
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
        await TsUtilities.addImportStatementsToFile(appComponentTs, [
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

        const routesTs: string = path.join(root, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);
        await FsUtilities.rename(
            path.join(root, 'src', 'app', 'app.routes.ts'),
            routesTs
        );
        await FsUtilities.replaceAllInFile(
            path.join(root, 'src', 'app', APP_CONFIG_FILE_NAME),
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

        await FsUtilities.mkdir(path.join(root, 'src', 'app', 'pages'));
    }

    /**
     * Install and setup ngx-pwa.
     * @param root - The directory of the angular project to setup the pwa support for.
     * @param name - The name of the angular project to setup the pwa support for.
     */
    static async setupPwa(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds pwa support');
        this.runCommand(root, `add @angular/pwa@${this.CLI_VERSION}`, { '--skip-confirmation': true });
        await NpmUtilities.install(name, [NpmPackage.NGX_PWA]);
        await FsUtilities.updateFile(
            path.join(root, 'src', 'app', 'app.component.html'),
            ['<ngx-pwa-offline-status-bar></ngx-pwa-offline-status-bar>'],
            'prepend'
        );
        await this.addComponentImports(
            path.join(root, 'src', 'app', 'app.component.ts'),
            [
                {
                    element: 'NgxPwaOfflineStatusBarComponent',
                    path: 'ngx-pwa',
                    defaultImport: false
                }
            ]
        );
    }

    /**
     * Updates an angular library ng-package.json.
     * @param path - The path of the ng-package.json.
     * @param data - The data to update with.
     */
    static async updateNgPackageJson(path: string, data: Partial<NgPackageJson>): Promise<void> {
        const oldData: NgPackageJson = await FsUtilities.parseFileAs(path);
        const updatedData: NgPackageJson = mergeDeep(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(updatedData), 'replace', false);
    }

    /**
     * Updates the angular json file at the given path.
     * @param path - The path of the angular.json.
     * @param data - The data to update with.
     */
    static async updateAngularJson(path: string, data: DeepPartial<AngularJson>): Promise<void> {
        const oldData: AngularJson = await FsUtilities.parseFileAs(path);
        const newData: AngularJson = mergeDeep<AngularJson>(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(newData), 'replace');
    }

    private static async addComponentImports(componentPath: string, imports: TsImportDefinition[]): Promise<void> {
        await TsUtilities.addImportStatementsToFile(componentPath, imports);
        let lines: string[] = await FsUtilities.readFileLines(componentPath);
        for (const imp of imports) {
            lines = await this.addComponentImport(lines, imp);
        }
        await FsUtilities.updateFile(componentPath, lines, 'replace');
    }

    private static async addComponentImport(lines: string[], imp: TsImportDefinition): Promise<string[]> {
        const l: FileLine = await this.getComponentImportLine(lines);
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