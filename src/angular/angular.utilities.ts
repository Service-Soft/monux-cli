import path from 'path';

import { CPUtilities, FileLine, FsUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TsImportDefinition, TsUtilities } from '../ts';

/**
 * Utilities for angular specific code generation/manipulation.
 */
export abstract class AngularUtilities {

    /**
     * Install and setup ngx-material-navigation.
     * @param root - The directory of the angular project to setup the navigation for.
     * @param name - The name of the angular project to setup the navigation for.
     */
    static async addNavigation(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds navigation');

        const navigationPackage: string = 'ngx-material-navigation';
        await NpmUtilities.install(name, [navigationPackage, '@fortawesome/angular-fontawesome', '@fortawesome/free-solid-svg-icons']);
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

        const routesTs: string = path.join(root, 'src', 'app', 'routes.ts');
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
                'import { FooterRow, NavElementTypes, NavRoute, NavUtilities, NavbarRow, NgxMatNavigationNotFoundComponent } from \'ngx-material-navigation}\';',
                '',
                'export const navbarRows: NavbarRow<NavRoute>[] = [',
                '\t{',
                '\t\telements: [',
                '\t\t\t{',
                '\t\t\t\ttype: NavElementTypes.TITLE_WITH_INTERNAL_LINK,',
                '\t\t\t\ttitle: \'Home\',',
                '\t\t\t\tlink: {',
                '\t\t\t\t\ttitle: \'Home\',',
                '\t\t\t\t\tpath: \'\',',
                '\t\t\t\t\tloadComponent: () => import(\'./pages/home/home.component\').then(m => m.HomeComponent)',
                '\t\t\t\t},',
                '\t\t\t\tcollapse: \'never\'',
                '\t\t\t}',
                '\t\t]',
                '\t}',
                '];',
                '',
                'export const footerRows: FooterRow[] = [];',
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
    }

    /**
     * Install and setup ngx-pwa.
     * @param root - The directory of the angular project to setup the pwa support for.
     * @param name - The name of the angular project to setup the pwa support for.
     */
    static async addPwaSupport(root: string, name: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('Adds pwa support');
        CPUtilities.execSync(`cd ${root} && npx @angular/cli add @angular/pwa --skip-confirmation`);
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

    private static async addComponentImports(componentPath: string, imports: TsImportDefinition[]): Promise<void> {
        for (const imp of imports) {
            let lines: string[] = await FsUtilities.readFileLines(componentPath);
            lines = TsUtilities.addImportStatement(lines, imp);
            lines = this.addComponentImport(lines, imp);
            await FsUtilities.updateFile(componentPath, lines, 'replace');
        }
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