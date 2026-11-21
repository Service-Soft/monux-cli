import { FsUtilities, InquirerUtilities, LogUtilities, Path, PathUtilities } from '../../encapsulation';
import { EslintUtilities } from '../../eslint';
import { NpmUtilities } from '../../npm';
import { TemplateUtilities } from '../../templates';
import { StringUtilities } from '../../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { GeneratePageConfiguration, generatePageConfigurationQuestions, PagePlacement } from './generate-page-configuration.model';

/**
 * The names a generated page is known by in the code of the website.
 */
type PageNames = {
    /**
     * The name of its folder and files, and its route, such as "about-us".
     */
    fileName: string,
    /**
     * The name of its component class, such as "AboutUsComponent".
     */
    className: string
};

// the lines of the website template the pages are added above. They fail loudly when a developer removed them
const MARKERS: Record<PagePlacement, string> = {
    navbar: '// mx generate-page adds the links of the navbar above this line',
    footer: '// mx generate-page adds the links of the footer above this line',
    none: '// mx generate-page adds the pages without a link in the navbar or the footer above this line'
};
const SERVER_ROUTES_MARKER: string = '// mx generate-page adds the pages it generates above this line';

/**
 * Generates a page of a website: its component, its route, its link and its prerendering.
 */
export class GeneratePageCommand extends BaseCommand<GeneratePageConfiguration> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(input: GeneratePageConfiguration): Promise<void> {
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(input.projectName, PathUtilities.resolve('.'));
        const names: PageNames = {
            fileName: StringUtilities.toKebabCase(input.pageName),
            className: `${StringUtilities.toPascalCase(input.pageName)}Component`
        };
        const app: Path = PathUtilities.resolve(project.path, 'src', 'app');

        LogUtilities.step(`Generating the page "${input.pageName}"`);
        await TemplateUtilities.write('angular-website-page', project.path, {
            fileName: names.fileName,
            className: names.className,
            heading: input.pageName,
            description: input.description
        });
        await this.addRoute(app, input, names);
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(app, 'app.routes.server.ts'),
            new RegExp(`\\n(\\s*)${SERVER_ROUTES_MARKER}`),
            `\n$1{ path: '${names.fileName}', renderMode: RenderMode.Prerender },\n$1${SERVER_ROUTES_MARKER}`
        );
        if (input.placement === 'navbar') {
            await this.addNavbarLinkComponent(app);
        }
        // its texts, into the translation of every other language of the website
        await NpmUtilities.run(input.projectName, 'i18n', false);
        await EslintUtilities.fix(project.path);
        LogUtilities.success(`Generated the page "${input.pageName}" at /${names.fileName}`);
    }

    protected override async resolveInput(): Promise<GeneratePageConfiguration> {
        return await InquirerUtilities.prompt(generatePageConfigurationQuestions);
    }

    private async addRoute(app: Path, input: GeneratePageConfiguration, names: PageNames): Promise<void> {
        // the texts marked for translation, like the ones of the pages mx add generates
        const route: string[] = [
            `path: '${names.fileName}',`,
            `title: $localize\`:@@${names.fileName}.title:${input.title}\`,`,
            `data: { description: $localize\`:@@${names.fileName}.description:${input.description}\` } satisfies NavRouteData,`,
            `loadComponent: async () => (await import('./pages/${names.fileName}/${names.fileName}.component')).${names.className}`
        ];
        const marker: string = MARKERS[input.placement];
        if (input.placement === 'none') {
            await FsUtilities.replaceInFile(
                PathUtilities.resolve(app, 'app.routes.ts'),
                new RegExp(`\\n(\\s*)${marker}`),
                `\n$1{\n${this.indent(route, '$1    ')}\n$1},\n$1${marker}`
            );
            return;
        }
        // a link with its whole route, which resolveRoutes of app.routes.ts adds to the router
        const link: string[] = [
            '{',
            '    type: \'link\',',
            `    name: $localize\`:@@${names.fileName}.link:${input.pageName}\`,`,
            ...input.placement === 'footer' ? ['    position: \'end\','] : [],
            '    route: {',
            ...route.map(line => `        ${line}`),
            '    }',
            '}'
        ];
        // the element before the marker ends without a comma, as the last of its list
        await FsUtilities.replaceInFile(
            PathUtilities.resolve(app, 'navigation.ts'),
            new RegExp(`\\n(\\s*)${marker}`),
            `,\n${this.indent(link, '$1')}\n$1${marker}`
        );
    }

    /**
     * Gives the navbar the component of its links, which it only gets with its first link: ngx-navigation refuses a
     * component no element of the navbar uses, so that its code stays out of the bundle.
     * @param app - The app folder of the website.
     */
    private async addNavbarLinkComponent(app: Path): Promise<void> {
        const componentPath: Path = PathUtilities.resolve(app, 'app.component.ts');
        const component: string = await FsUtilities.readFile(componentPath);
        if (/navbarComponents[^\n]*link: NavLinkComponent/.test(component)) {
            return;
        }
        await FsUtilities.replaceInFile(
            componentPath,
            /(navbarComponents: Partial<NavElementComponents> = \{ [^}]*?) \}/,
            '$1, link: NavLinkComponent }'
        );
    }

    private indent(lines: string[], indentation: string): string {
        return lines.map(line => `${indentation}${line}`).join('\n');
    }
}