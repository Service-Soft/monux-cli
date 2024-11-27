import path from 'path';

import type { FooterRow, NavbarRow } from 'ngx-material-navigation';

import { CPUtilities, FileLine, FsUtilities, JsonUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TsImportDefinition, TsUtilities } from '../ts';
import { AngularJson, AngularJsonAssetPattern } from './angular-json.model';
import { NgPackageJson } from './ng-package-json.model';
import { ANGULAR_JSON_FILE_NAME, ANGULAR_ROUTES_FILE_NAME } from '../constants';
import { DeepPartial } from '../types';
import { AddNavElementConfig } from './add-nav-element-config.model';
import { mergeDeep, optionsToCliString } from '../utilities';

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
    '--style'?: 'css' | 'scss',
    /**
     * Whether or not to use ssr.
     */
    '--ssr'?: boolean
};

/**
 * Cli Options for running ng generate.
 */
type GenerateOptions = {
    /**
     * Whether or not generating tests should be skipped.
     */
    '--skip-tests'?: boolean
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
        const pagesDir: string = path.join(root, 'src', 'app', 'pages');
        this.runCommand(pagesDir, `generate component ${pageName}`, { '--skip-tests': true });

        if (navElement) {
            await this.addNavElement(root, navElement);
        }

        const sitemapPath: string = path.join(root, 'src', 'sitemap.xml');
        if (domain && await FsUtilities.exists(sitemapPath)) {
            await FsUtilities.replaceAllInFile(
                sitemapPath,
                '</urlset>',
                `\t<url>\n\t\t<loc>https://${domain}</loc>\n\t</url>\n</urlset>`
            );
        }
    }

    private static async addNavElement(projectPath: string, element: AddNavElementConfig): Promise<void> {
        const routesPath: string = path.join(projectPath, 'src', 'app', ANGULAR_ROUTES_FILE_NAME);
        const lines: string[] = await FsUtilities.readFileLines(routesPath);

        const startIdentifier: string = element.addTo === 'navbar' ? ': NavbarRow<NavRoute>[]' : ': FooterRow[]';
        const firstLine: FileLine = FsUtilities.findLineWithContent(lines, startIdentifier);
        const lastLine: FileLine = FsUtilities.findLineWithContent(lines, '];', firstLine.index);
        const contentLines: FileLine[] = FsUtilities.getFileLines(lines, firstLine.index + 1, lastLine.index - 1);
        const contentString: string = `[\n${contentLines.map(l => l.content).join('\n')}\n]`;
        const content: (NavbarRow | FooterRow)[] = JsonUtilities.parseAsTs(contentString);

        content[element.rowIndex].elements.push(element.element);

        const stringifiedContent: string = JsonUtilities.stringifyAsTs(content);

        await FsUtilities.replaceInFile(
            routesPath,
            contentLines
                .map(l => l.content)
                .join('\n')
                .slice(1),
            stringifiedContent.slice(3, stringifiedContent.length - 2),
            firstLine.index
        );
    }

    /**
     * Adds tracking to the angular project with the given name.
     * @param projectName - The name of the angular project to add tracking to.
     */
    static async addTracking(projectName: string): Promise<void> {
        throw new Error('Not implemented');
        // eslint-disable-next-line no-console
        console.log('Adds tracking');
        const trackingPackage: string = 'ngx-material-tracking';
        await NpmUtilities.install(projectName, [trackingPackage]);
    }

    /**
     * Adds a sitemap.xml and a robots.txt to a project at the given path.
     * @param root - The root of the angular project to add the files to.
     * @param projectName - The name of the project.
     * @param domain - The domain of the project.
     */
    static async addSitemapAndRobots(root: string, projectName: string, domain: string): Promise<void> {
        await FsUtilities.createFile(path.join(root, 'src', 'robots.txt'), [
            'User-agent: *',
            'Allow: /',
            '',
            `Sitemap: https://${domain}/sitemap.xml`
        ]);
        await FsUtilities.createFile(path.join(root, 'src', 'sitemap.xml'), [
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
                                    'src/sitemap.xml',
                                    'src/robots.txt'
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
    static async addNavigation(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds navigation');

        const navigationPackage: string = 'ngx-material-navigation';
        await NpmUtilities.install(name, [navigationPackage]);
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
                    path: navigationPackage,
                    defaultImport: false
                },
                {
                    element: 'NgxMatNavigationFooterComponent',
                    path: navigationPackage,
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
                path: navigationPackage,
                defaultImport: false
            },
            {
                element: 'FooterRow',
                path: navigationPackage,
                defaultImport: false
            }
        ]);

        const tsLines: string[] = await FsUtilities.readFileLines(appComponentTs);
        const componentLine: FileLine = this.getComponentImportLine(tsLines);
        const classLine: FileLine = FsUtilities.findLineWithContent(tsLines, '{', componentLine.index);
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
            path.join(root, 'src', 'app', 'app.config.ts'),
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
    static async addPwaSupport(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds pwa support');
        this.runCommand(root, 'add @angular/pwa', { '--skip-confirmation': true });
        await NpmUtilities.install(name, ['ngx-pwa']);
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
        const updatedData: NgPackageJson = {
            ...oldData,
            ...data
        };
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
            lines = this.addComponentImport(lines, imp);
        }
        await FsUtilities.updateFile(componentPath, lines, 'replace');
    }

    private static addComponentImport(lines: string[], imp: TsImportDefinition): string[] {
        const l: FileLine = this.getComponentImportLine(lines);
        if (l.content.includes(']')) {
            l.content = l.content.replace(']', `, ${imp.element}]`);
            lines[l.index] = l.content;
            return lines;
        }
        const closingArrayLine: FileLine = FsUtilities.findLineWithContent(lines, ']', l.index);
        lines[closingArrayLine.index - 1] = `${lines[closingArrayLine.index - 1]},\n\t\t${imp.element}`;
        return lines;
    }

    private static getComponentImportLine(lines: string[]): FileLine {
        const componentLine: string | undefined = lines.find(l => l.includes('@Component'));
        if (!componentLine) {
            throw new Error('The file does not contain an @Component decorator');
        }
        return FsUtilities.findLineWithContent(lines, 'imports:', lines.indexOf(componentLine));
    }
}