import { Dirent } from 'fs';

import { APPS_DIRECTORY_NAME, LIBS_DIRECTORY_NAME, WORKSPACE_FILE_NAME } from '../constants';
import { FsUtilities, JsonUtilities } from '../encapsulation';
import { WorkspaceConfig } from './workspace-config.model';

/**
 * Utilities for the root workspace.
 */
export abstract class WorkspaceUtilities {

    /**
     * Creates a new workspace config file inside the current directory.
     */
    static async createConfig(): Promise<void> {
        const cwd: string = process.cwd();
        const currentDirectory: string = cwd.substring(cwd.lastIndexOf('/') + 1);
        const data: WorkspaceConfig = { isWorkspace: true, name: currentDirectory };
        await FsUtilities.createFile(WORKSPACE_FILE_NAME, JsonUtilities.stringify(data));
    }

    /**
     * Gets the workspace configuration if there is any.
     * @returns The found config or undefined.
     */
    static async getConfig(): Promise<WorkspaceConfig | undefined> {
        if (!await FsUtilities.exists(WORKSPACE_FILE_NAME)) {
            return;
        }
        const fileContent: string = await FsUtilities.readFile(WORKSPACE_FILE_NAME);
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
     * @returns The found directory or undefined.
     */
    static async findProject(name: string): Promise<Dirent | undefined> {
        const allProjects: Dirent[] = await this.getProjects();
        return allProjects.find(p => p.name === name);
    }

    /**
     * Finds the directory of the project with the given name.
     * @param name - The name of the project to find.
     * @returns The found directory.
     * @throws When no project with the given name was found.
     */
    static async findProjectOrFail(name: string): Promise<Dirent> {
        const res: Dirent | undefined = await this.findProject(name);
        if (res == undefined) {
            throw new Error(`project with name ${name} does not exist`);
        }
        return res;
    }

    /**
     * Gets either all libraries, all apps or every project.
     * @param filter - Filter to only return libraries, apps or all projects.
     * @returns An array of directories.
     */
    static async getProjects(filter: 'libs' | 'apps' | 'all' = 'all'): Promise<Dirent[]> {
        switch (filter) {
            case 'apps': {
                return await this.getApps();
            }
            case 'libs': {
                return await this.getLibs();
            }
            case 'all': {
                return [
                    ...await this.getApps(),
                    ...await this.getLibs()
                ];
            }
        }
    }

    private static async getApps(): Promise<Dirent[]> {
        return (await FsUtilities.readdir(APPS_DIRECTORY_NAME)).filter(d => d.isDirectory());
    }

    private static async getLibs(): Promise<Dirent[]> {
        return (await FsUtilities.readdir(LIBS_DIRECTORY_NAME)).filter(d => d.isDirectory());
    }
}