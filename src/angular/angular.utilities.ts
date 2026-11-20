import { CPUtilities, FsUtilities, JsonUtilities, Path } from '../encapsulation';
import { DeepPartial } from '../types';
import { mergeDeep, optionsToCliString } from '../utilities';
import { AngularJson } from './angular-json.model';
import { NgPackageJson } from './ng-package-json.model';

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
    '--style'?: 'css' | 'tailwind',
    /**
     * Whether or not to use ssr.
     */
    '--ssr'?: boolean,
    /**
     * Whether or not to use inline styles instead of a whole css file for each component.
     */
    '--inline-style'?: boolean,
    /**
     * Whether or not to configure some ai.
     */
    '--ai-config': 'none',
    /**
     * Whether or not to use zoneless change detection.
     */
    '--zoneless': boolean,
    /**
     * How generated files are named. 2016 names a component "app.component.ts", like the @service-soft libraries do.
     */
    '--file-name-style-guide'?: '2016',
    /**
     * Whether every option that is not given takes its default, instead of being asked for.
     */
    '--defaults'?: boolean
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
type AngularCliOptions<T extends AngularCliCommands>
    = T extends CliNew ? NewOptions
        : T extends CliGenerate ? GenerateOptions
            : T extends CliAdd ? AddOptions
                : never;

/**
 * Utilities for angular specific code generation/manipulation.
 */
export abstract class AngularUtilities {

    private static readonly CLI_VERSION: string = '22.3.0';

    // what a title ends up in: typescript strings, html and the meta tags of the pages
    private static readonly TITLE_REGEX: RegExp = /^[^"'<>\\{}`]+$/;

    private static readonly LANGUAGE_REGEX: RegExp = /^[a-z]{2}(-[A-Z]{2})?$/;

    /**
     * Validates the name of a project, as the titles of its pages show it.
     * @param title - The name.
     * @returns True, or what is wrong with it.
     */
    static validateTitle(title?: string): true | string {
        return title != undefined && this.TITLE_REGEX.test(title)
            ? true
            : 'The name needs to be without quotes, "<", ">", "{", "}" and "\\"';
    }

    /**
     * Validates the language a project is written in.
     * @param language - The code of the language.
     * @returns True, or what is wrong with it.
     */
    static validateLanguage(language?: string): true | string {
        return language != undefined && this.LANGUAGE_REGEX.test(language)
            ? true
            : 'The language needs to be a code like "en" or "de-AT"';
    }

    /**
     * Adds Angular's service worker to a project, which keeps its files on the device so that it opens offline, with
     * its config, its manifest and its icons.
     * @param root - The directory of the project.
     */
    static async addServiceWorker(root: Path): Promise<void> {
        await this.runCommand(root, `add @angular/pwa@${this.CLI_VERSION}`, { '--skip-confirmation': true });
    }

    /**
     * Runs an angular cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static async runCommand(directory: Path, command: AngularCliCommands, options: AngularCliOptions<typeof command>): Promise<void> {
        await CPUtilities.exec(`cd ${directory} && npx --yes @angular/cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options)}`);
    }

    /**
     * Updates an angular library ng-package.json.
     * @param path - The path of the ng-package.json.
     * @param data - The data to update with.
     */
    static async updateNgPackageJson(path: Path, data: Partial<NgPackageJson>): Promise<void> {
        const oldData: NgPackageJson = await FsUtilities.parseFileAs(path);
        const updatedData: NgPackageJson = mergeDeep(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(updatedData), 'replace');
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
}