import { Dirent } from 'fs';
import path from 'path';

import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceUtilities } from '../workspace';
import { PackageJson } from './package-json.model';
import { PACKAGE_JSON_FILE_NAME } from '../constants';

/**
 *
 */
type NpmInitConfig = {
    /**
     *
     */
    scope: string,
    /**
     *
     */
    path: string
};

/**
 * Utilities for npm cli.
 */
export abstract class NpmUtilities {

    /**
     *
     * @param config
     * @param output
     */
    static async init(config: 'root' | NpmInitConfig, output?: boolean): Promise<void> {
        if (config === 'root') {
            CPUtilities.execSync('npm init -y', output);
            await this.update(PACKAGE_JSON_FILE_NAME, {});
            return;
        }
        CPUtilities.execSync(
            `npm init -y --scope=${config.scope} -w ${config.path}`,
            output
        );
        const packageJsonPath: string = path.join(config.path, PACKAGE_JSON_FILE_NAME);
        await this.update(packageJsonPath, {});
    }

    /**
     * Runs the given npm script in the project with the provided name.
     * @param projectName - The project to run the npm script in.
     * @param npmScript - The npm script to run.
     */
    static async run(projectName: string, npmScript: string): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const projectPath: string = path.join(project.parentPath, project.name);
        CPUtilities.execSync(`cd ${projectPath} && npm run ${npmScript}`);
    }

    /**
     * Installs the provided packages inside the project with the given name.
     * @param projectName - The name of the project to install the package in.
     * @param npmPackages - The packages to install.
     * @param development - Whether or not the packages will be installed with -D or not.
     */
    static async install(projectName: string, npmPackages: string[], development: boolean = false): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const projectPath: string = path.join(project.parentPath, project.name);
        this.installInPath(projectPath, npmPackages, development);
    }

    /**
     * Installs the provided packages inside the root directory.
     * @param npmPackages - The packages to install.
     * @param development - Whether or not the packages will be installed with -D or not.
     */
    static async installInRoot(npmPackages: string[], development: boolean = false): Promise<void> {
        this.installInPath('', npmPackages, development);
    }

    private static installInPath(path: string, npmPackages: string[], development: boolean): void {
        const installCommand: string = development ? 'npm i -D' : 'npm i';
        CPUtilities.execSync(npmPackages.reduce((prev, p) => `${prev} && ${installCommand} ${p}`, `cd ${path}`));
    }

    /**
     * Updates the package.json of the project with the provided name.
     * @param projectName - The name of the project to update the package.json from.
     * @param data - The data to update the package.json with.
     */
    static async updatePackageJson(projectName: string, data: Partial<PackageJson>): Promise<void> {
        const project: Dirent = await WorkspaceUtilities.findProjectOrFail(projectName);
        const packageJsonPath: string = path.join(project.parentPath, project.name, PACKAGE_JSON_FILE_NAME);
        await this.update(packageJsonPath, data);
    }

    /**
     * Updates the root package.json of the monorepo.
     * @param data - The data to update the package.json with.
     */
    static async updateRootPackageJson(data: Partial<PackageJson>): Promise<void> {
        await this.update(PACKAGE_JSON_FILE_NAME, data);
    }

    private static async update(path: string, data: Partial<PackageJson>): Promise<void> {
        const oldPackageJson: PackageJson = await FsUtilities.parseFileAs(path);
        const packageJson: PackageJson = {
            ...oldPackageJson,
            ...data,
            scripts: {
                ...data.scripts
            }
        };
        await FsUtilities.updateFile(path, JsonUtilities.stringify(packageJson), 'replace', false);
    }
}