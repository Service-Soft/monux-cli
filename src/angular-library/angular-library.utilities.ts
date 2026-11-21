import { AngularJson } from '../angular';
import { ANGULAR_JSON_FILE_NAME } from '../constants';
import { FsUtilities, LogUtilities, Path, PathUtilities } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TemplateUtilities } from '../templates';
import { TsLibraryUtilities } from '../ts-library';
import { StringUtilities } from '../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';

// the line of the styles.css of the Angular templates of Monux, which the libraries a project uses are imported above
const STYLES_MARKER: string = '/* the look of every project of the workspace */';

/**
 * The names a component of a library is known by in its code.
 */
type ComponentNames = {
    /**
     * The name of its entry point, its folder and its files, such as "opening-hours".
     */
    fileName: string,
    /**
     * The start of the names of its classes and types, such as "OpeningHours".
     */
    className: string,
    /**
     * The start of the names of its constants, such as "OPENING_HOURS".
     */
    constantName: string,
    /**
     * What its documentation calls it, such as "opening hours".
     */
    label: string
};

/**
 * Adds components to the Angular libraries of a workspace, and the libraries to the projects that use them.
 */
export abstract class AngularLibraryUtilities {

    /**
     * Validates the name of a component, which its entry point, its classes and its selector are named after.
     * @param name - The name, such as "Opening hours".
     * @returns True, or what is wrong with the name.
     */
    static validateComponentName(name: string | undefined): true | string {
        return name != undefined && /^[A-Za-z][\d A-Za-z]*$/.test(name)
            ? true
            : 'The name needs to start with a letter, and be letters, digits and spaces';
    }

    /**
     * Adds a component to a library, as an entry point of its own with its config, its test and its stories, so a page
     * that imports it gets nothing else of the library.
     * @param library - The library.
     * @param componentName - The name of the component, such as "Opening hours".
     * @returns The name of its entry point, which projects import it by below the package of the library.
     */
    static async addComponent(library: WorkspaceProject, componentName: string): Promise<string> {
        const names: ComponentNames = this.resolveComponentNames(componentName);
        const prefix: string = await this.resolvePrefix(library);
        LogUtilities.step(`Adding the component "${componentName}" to "${library.name}"`);
        await TemplateUtilities.write('angular-library-component', library.path, {
            ...names,
            selector: `${prefix}-${names.fileName}`,
            storyTitle: `${StringUtilities.toPascalCase(library.name)}/${names.className}`
        });
        return names.fileName;
    }

    /**
     * Adds a library to an Angular project: as a dependency that is built before the scripts of the project, like a
     * Typescript library, and with its styles, so the tailwind of the project generates the classes of its components.
     * @param library - The library.
     * @param projectName - The name of the project that uses it.
     */
    static async install(library: WorkspaceProject, projectName: string): Promise<void> {
        await TsLibraryUtilities.install(library, projectName);
        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(projectName, PathUtilities.resolve('.'));
        const stylesPath: Path = PathUtilities.resolve(project.path, 'src', 'styles.css');
        const styles: string = await FsUtilities.exists(stylesPath) ? await FsUtilities.readFile(stylesPath) : '';
        const packageName: string = await NpmUtilities.resolvePackageName(library);
        if (!styles.includes(STYLES_MARKER)) {
            LogUtilities.warning(`Add @import "${packageName}"; to the styles of "${projectName}", so that it styles the components`);
            return;
        }
        await FsUtilities.replaceInFile(stylesPath, STYLES_MARKER, `@import "${packageName}";\n${STYLES_MARKER}`);
    }

    private static resolveComponentNames(componentName: string): ComponentNames {
        const fileName: string = StringUtilities.toKebabCase(componentName);
        return {
            fileName,
            className: StringUtilities.toPascalCase(componentName),
            constantName: StringUtilities.toSnakeCase(fileName).toUpperCase(),
            label: fileName.replaceAll('-', ' ')
        };
    }

    // the prefix the selectors of the library start with, which its angular.json and its lint rules name
    private static async resolvePrefix(library: WorkspaceProject): Promise<string> {
        const angularJson: AngularJson = await FsUtilities.parseFileAs(PathUtilities.resolve(library.path, ANGULAR_JSON_FILE_NAME));
        const prefix: string | undefined = angularJson.projects[library.name]?.prefix;
        if (prefix == undefined) {
            throw new Error(`The angular.json of "${library.name}" names no prefix of its selectors`);
        }
        return prefix;
    }
}