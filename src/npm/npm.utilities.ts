import { Dirent } from 'fs';

import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceUtilities } from '../workspace';
import { PackageJson } from './package-json.model';
import { PACKAGE_JSON_FILE_NAME } from '../constants';
import { NpmPackage } from './npm-package.enum';
import { getPath, mergeDeep } from '../utilities';

/**
 * Options for running the npm init command.
 */
type NpmInitConfig = {
    /**
     * The scope of the project to initialize (eg. @project).
     */
    scope: string,
    /**
     * The path where the project should be initialized.
     */
    path: string
};

/**
 * Well known npm scripts that are frequently used.
 */
type FrequentlyUsedNpmScripts = 'build' | 'start' | 'test';

/**
 * Type for an npm script.
 * Provides autocomplete for frequently used scripts like "build", "start" or "test" but also provides support for any other string.
 */
export type NpmScript = FrequentlyUsedNpmScripts | Omit<string, FrequentlyUsedNpmScripts>;

/**
 * Utilities for the npm cli.
 */
export abstract class NpmUtilities {

    /**
     * Initializes a new npm project.
     * @param config - Configuration for how and where the project should be initialized.
     * @param output - Whether or not the output of the command should be logged.
     */
    static async init(config: 'root' | NpmInitConfig, output?: boolean): Promise<void> {
        if (config === 'root') {
            CPUtilities.execSync('npm init -y', output);
            const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(PACKAGE_JSON_FILE_NAME);
            await FsUtilities.updateFile(PACKAGE_JSON_FILE_NAME, JsonUtilities.stringify(oldPackageJson), 'replace', false);
            return;
        }
        CPUtilities.execSync(
            `npm init -y --scope=${config.scope} -w ${config.path}`,
            output
        );
        const packageJsonPath: string = getPath(config.path, PACKAGE_JSON_FILE_NAME);
        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(packageJsonPath);
        await FsUtilities.updateFile(packageJsonPath, JsonUtilities.stringify(oldPackageJson), 'replace', false);
    }

    /**
     * Runs the given npm script in the project with the provided name.
     * @param projectName - The project to run the npm script in.
     * @param commands - The npm script to run.
     */
    static run(projectName: string, commands: string): void {
        CPUtilities.execSync(`npm run ${commands} --workspace=${projectName}`);
    }

    /**
     * Runs the given script inside all projects that have it.
     * @param npmScript - The npm script to run.
     */
    static runAll(npmScript: NpmScript): void {
        CPUtilities.execSync(`npm run ${npmScript} --workspaces --if-present`);
    }

    /**
     * Installs the provided packages inside the project with the given name.
     * @param projectName - The name of the project to install the package in.
     * @param npmPackages - The packages to install.
     * @param development - Whether or not the packages will be installed with -D or not.
     */
    static async install(projectName: string, npmPackages: NpmPackage[], development: boolean = false): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const projectPath: string = getPath(project.parentPath, project.name);

        const installCommand: string = development ? 'npm i -D' : 'npm i';
        CPUtilities.execSync(`cd ${projectPath} && ${installCommand} ${npmPackages.join(' ')}`);
    }

    /**
     * Installs the provided packages inside the root directory.
     * @param npmPackages - The packages to install.
     * @param development - Whether or not the packages will be installed with -D or not.
     */
    static installInRoot(npmPackages: NpmPackage[], development: boolean = false): void {
        const installCommand: string = development ? 'npm i -D' : 'npm i';
        CPUtilities.execSync(`${installCommand} ${npmPackages.join(' ')}`, true);
    }

    /**
     * Updates the package.json of the project with the provided name.
     * @param projectName - The name of the project to update the package.json from.
     * @param data - The data to update the package.json with.
     */
    static async updatePackageJson(projectName: string, data: Partial<PackageJson>): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const packageJsonPath: string = getPath(project.parentPath, project.name, PACKAGE_JSON_FILE_NAME);
        await this.updatePackageJsonFile(packageJsonPath, data);
    }

    /**
     * Updates the root package.json of the monorepo.
     * @param data - The data to update the package.json with.
     */
    static async updateRootPackageJson(data: Partial<PackageJson>): Promise<void> {
        await this.updatePackageJsonFile(PACKAGE_JSON_FILE_NAME, data);
    }

    /**
     * Updates the package.json at the given path.
     * @param path - The path of the package.json to update.
     * @param data - The data to update the package.json with.
     */
    static async updatePackageJsonFile(path: string, data: Partial<PackageJson>): Promise<void> {
        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(path);
        const packageJson: PackageJson = mergeDeep(oldPackageJson, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(packageJson), 'replace', false);
    }
}