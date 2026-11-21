import { AngularUtilities } from '../../../angular';
import { AngularLibraryUtilities } from '../../../angular-library';
import { LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../../constants';
import { FsUtilities, LogUtilities, Path, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities, PackageJson } from '../../../npm';
import { TemplateUtilities } from '../../../templates';
import { OmitStrict } from '../../../types';
import { filterAsync, StringUtilities } from '../../../utilities';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, AddType, BaseAddCommand } from '../models';

/**
 * Configuration for adding a new angular library.
 */
type AddAngularLibraryConfiguration = AddConfiguration & {
    /**
     * The scope of the package of the library, eg. '@shop'.
     */
    scope: string,
    /**
     * What the selectors of its components start with, eg. 'shop' for `<shop-notice>`.
     */
    prefix: string,
    /**
     * The name of the first component of the library.
     */
    componentName: string,
    /**
     * The names of the Angular projects that use the library.
     */
    projects: string[]
};

// taken by the Angular cli and the @service-soft libraries, whose selectors the ones of the library would clash with
const RESERVED_PREFIXES: string[] = ['app', 'ng', 'ngx', 'ui'];

// what ng-packagr and storybook call what they write, which the spellchecker of the workspace does not know
const LIBRARY_WORDS: string[] = ['fesm', 'errordisplay'];

// what the library is built, checked and linted with, next to what "ng new" installs
const DEV_DEPENDENCIES: NpmPackage[] = [
    NpmPackage.NG_PACKAGR,
    NpmPackage.SERVICE_SOFT_UI,
    NpmPackage.FONTAWESOME_SOLID_ICONS,
    NpmPackage.TAILWIND,
    NpmPackage.TAILWIND_POSTCSS,
    NpmPackage.POSTCSS,
    NpmPackage.STORYBOOK,
    NpmPackage.STORYBOOK_ANGULAR,
    NpmPackage.STORYBOOK_ADDON_A11Y,
    NpmPackage.ANGULAR_DEVKIT_BUILD_ANGULAR,
    NpmPackage.ANGULAR_PLATFORM_BROWSER_DYNAMIC,
    NpmPackage.PLAYWRIGHT,
    NpmPackage.AXE_CORE_PLAYWRIGHT,
    NpmPackage.TYPES_NODE,
    NpmPackage.ESLINT_PLUGIN_BETTER_TAILWINDCSS
];

/**
 * Command that handles adding an angular library to the monorepo: components the Angular projects of the workspace
 * share, built like the @service-soft libraries, see GOALS.md.
 */
export class AddAngularLibraryCommand extends BaseAddCommand<AddAngularLibraryConfiguration> {

    protected override configQuestions: QuestionsFor<OmitStrict<AddAngularLibraryConfiguration, keyof AddConfiguration>> = {
        scope: {
            type: 'input',
            name: 'scope',
            message: 'Scope',
            validate: (v?: string) => !!v,
            default: async () => `@${(await WorkspaceUtilities.getConfigOrFail()).name}`
        },
        prefix: {
            type: 'input',
            name: 'prefix',
            message: 'Prefix of the selectors of its components',
            validate: (v?: string) => v != undefined && /^[a-z][\da-z]*$/.test(v) && !RESERVED_PREFIXES.includes(v)
                ? true
                : `The prefix needs to be lower case letters and digits, and none of ${RESERVED_PREFIXES.join(', ')}`,
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return workspaceConfig.name.toLowerCase().replaceAll(/[^\da-z]/g, '');
            }
        },
        componentName: {
            type: 'input',
            name: 'componentName',
            message: 'Name of its first component',
            validate: (v?: string) => AngularLibraryUtilities.validateComponentName(v),
            default: 'Notice'
        },
        projects: {
            type: 'checkbox',
            name: 'projects',
            message: 'Angular projects that use the library',
            choices: async () => (await this.findAngularProjects()).map(p => p.name)
        }
    };

    protected override async run(): Promise<void> {
        const config: AddAngularLibraryConfiguration = await this.getConfig();
        const root: Path = await this.createProject(config);
        const library: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(config.name, PathUtilities.resolve('.'));

        await AngularLibraryUtilities.addComponent(library, config.componentName);
        LogUtilities.step('Setting up eslint');
        await EslintUtilities.addLintScripts(root);
        await EslintUtilities.addWords(LIBRARY_WORDS);
        await EslintUtilities.fix(root);

        LogUtilities.step('Building the library');
        await NpmUtilities.run(config.name, 'build', false);
        for (const project of config.projects) {
            await AngularLibraryUtilities.install(library, project);
        }
        LogUtilities.success(`Added "${config.name}" in ${PathUtilities.getRelative(PathUtilities.resolve('.'), root)}`);
    }

    private async findAngularProjects(): Promise<WorkspaceProject[]> {
        const rootDir: Path = PathUtilities.resolve('.');
        return await filterAsync(await WorkspaceUtilities.getProjects('apps', rootDir), async p => {
            const type: AddType | undefined = await WorkspaceUtilities.findProjectType(p.name, rootDir);
            return type === AddType.ANGULAR || type === AddType.ANGULAR_WEBSITE;
        });
    }

    /**
     * Creates the Angular workspace of the library, which "ng new" gives the dependencies of the Angular Monux uses, and
     * writes the library into it from templates/angular-library.
     * @param config - The configuration of the library.
     * @returns The directory of the library.
     */
    private async createProject(config: AddAngularLibraryConfiguration): Promise<Path> {
        LogUtilities.step('Creating the Angular workspace of the library');
        await AngularUtilities.runCommand(
            PathUtilities.resolve(LIBS_DIRECTORY_NAME),
            `new ${config.name}`,
            { '--no-create-application': true, '--skip-git': true, '--zoneless': true, '--ai-config': 'none', '--defaults': true }
        );
        const root: Path = PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name);
        const generated: PackageJson = await FsUtilities.parseFileAs(PathUtilities.resolve(root, PACKAGE_JSON_FILE_NAME));
        // what the workspace has once for every project, or what the template replaces
        await Promise.all(['.vscode', '.editorconfig', '.gitignore', '.prettierrc', 'README.md']
            .map(f => FsUtilities.rm(PathUtilities.resolve(root, f))));

        LogUtilities.step('Adding the build, the stories and their AXE checks');
        const packageName: string = `${config.scope}/${config.name}`;
        await TemplateUtilities.write('angular-library', root, {
            name: config.name,
            prefix: config.prefix,
            packageName,
            // ng-packagr names the files of each entry point after the package, like "shop-ui-notice.mjs"
            distName: packageName.replace('@', '').replace('/', '-'),
            firstEntryPoint: StringUtilities.toKebabCase(config.componentName)
        });
        await NpmUtilities.updatePackageJson(config.name, {
            // a library brings no Angular of its own: the one of the app that uses it
            devDependencies: { ...generated.dependencies, ...generated.devDependencies },
            peerDependencies: {
                '@angular/common': this.findVersion(generated, '@angular/common'),
                '@angular/core': this.findVersion(generated, '@angular/core'),
                // its components are styled with the tokens of ui, by the tailwind of the app
                '@service-soft/ui': this.getVersionRange(NpmPackage.SERVICE_SOFT_UI),
                tailwindcss: this.getVersionRange(NpmPackage.TAILWIND)
            }
        });
        await NpmUtilities.install(config.name, DEV_DEPENDENCIES, true);
        return root;
    }

    private findVersion(packageJson: PackageJson, name: string): string {
        const version: string | undefined = packageJson.dependencies[name];
        if (version == undefined) {
            throw new Error(`"ng new" installed no ${name}`);
        }
        return version;
    }

    // the range of a pinned package, eg. "^22.2.0" of "@service-soft/ui@^22.2.0"
    private getVersionRange(npmPackage: NpmPackage): string {
        return npmPackage.slice(npmPackage.lastIndexOf('@') + 1);
    }
}