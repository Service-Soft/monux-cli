import { Dirent } from 'fs';

import { APPS_DIRECTORY_NAME, LIBS_DIRECTORY_NAME, WORKSPACE_FILE_NAME } from '../constants';
import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceConfig } from './workspace-config.model';
import { getPath, Path } from '../utilities';

/**
 * Definition for a single project inside the apps or libs dir.
 */
export type WorkspaceProject = {
    /**
     * The name of the project/folder.
     */
    name: string,
    /**
     * The string to use for the --workspace option of the npm cli.
     */
    npmWorkspaceString: string,
    /**
     * The path to the project folder.
     */
    path: Path
};

/**
 * Utilities for the root workspace.
 */
export abstract class WorkspaceUtilities {

    /**
     * Creates a new workspace config file inside the current directory.
     */
    static async createConfig(): Promise<void> {
        const cwd: string = CPUtilities['cwd'] ?? process.cwd();
        const currentDirectory: string = cwd.substring(cwd.lastIndexOf('/') + 1);
        const data: WorkspaceConfig = { isWorkspace: true, name: currentDirectory };
        await FsUtilities.createFile(getPath(WORKSPACE_FILE_NAME), JsonUtilities.stringify(data));
    }

    /**
     * Gets the workspace configuration if there is any.
     * @param workspaceFilePath - The path of the mx workspace file. Can be used when not running in the context of a workspace.
     * @returns The found config or undefined.
     */
    static async getConfig(workspaceFilePath: Path = getPath(WORKSPACE_FILE_NAME)): Promise<WorkspaceConfig | undefined> {
        if (!await FsUtilities.exists(workspaceFilePath)) {
            return;
        }
        const fileContent: string = await FsUtilities.readFile(workspaceFilePath);
        return JsonUtilities.parse(fileContent);
    }

    /**
     * Gets the workspace configuration.
     * @returns The workspace config.
     * @throws When no workspace config was found.
     */
    static async getConfigOrFail(): Promise<WorkspaceConfig> {
        const res: WorkspaceConfig | undefined = await this.getConfig();
        if (res == undefined) {
            throw new Error('current directory is not a workspace');
        }
        return res;
    }

    /**
     * Finds the directory of the project with the given name.
     * @param name - The name of the project to find.
     * @param rootDir - The directory of the Monux monorepo to find the project in.
     * @returns The found directory or undefined.
     */
    static async findProject(name: string, rootDir: string): Promise<WorkspaceProject | undefined> {
        const allProjects: WorkspaceProject[] = await this.getProjects('all', rootDir);
        return allProjects.find(p => p.name === name);
    }

    /**
     * Finds the directory of the project with the given name.
     * @param name - The name of the project to find.
     * @param rootDir - The directory of the Monux monorepo to find the project in.
     * @returns The found directory.
     * @throws When no project with the given name was found.
     */
    static async findProjectOrFail(name: string, rootDir: string): Promise<WorkspaceProject> {
        const res: WorkspaceProject | undefined = await this.findProject(name, rootDir);
        if (res == undefined) {
            throw new Error(`project with name ${name} does not exist`);
        }
        return res;
    }

    /**
     * Gets either all libraries, all apps or every project.
     * @param filter - Filter to only return libraries, apps or all projects.
     * @param rootDir - The directory of the Monux monorepo to get the projects for.
     * @returns An array of directories.
     */
    static async getProjects(filter: 'libs' | 'apps' | 'all' = 'all', rootDir: string): Promise<WorkspaceProject[]> {
        switch (filter) {
            case 'apps': {
                return await this.getApps(rootDir);
            }
            case 'libs': {
                return await this.getLibs(rootDir);
            }
            case 'all': {
                return [
                    ...await this.getApps(rootDir),
                    ...await this.getLibs(rootDir)
                ];
            }
        }
    }

    private static async getApps(rootDir: string): Promise<WorkspaceProject[]> {
        const dirs: Dirent[] = (await FsUtilities.readdir(getPath(rootDir, APPS_DIRECTORY_NAME))).filter(d => d.isDirectory());
        return dirs.map(d => {
            const res: WorkspaceProject = {
                name: d.name,
                npmWorkspaceString: `${APPS_DIRECTORY_NAME}/${d.name}`,
                path: getPath(d.parentPath, d.name)
            };
            return res;
        });
    }

    private static async getLibs(rootDir: string): Promise<WorkspaceProject[]> {
        const dirs: Dirent[] = (await FsUtilities.readdir(getPath(rootDir, LIBS_DIRECTORY_NAME))).filter(d => d.isDirectory());
        return dirs.map(d => {
            const res: WorkspaceProject = {
                name: d.name,
                npmWorkspaceString: `${LIBS_DIRECTORY_NAME}/${d.name}`,
                path: getPath(d.parentPath, d.name)
            };
            return res;
        });
    }
}