import { AddType } from '../commands/add/models/add-type.enum';

/**
 * What Monux knows about a project of the workspace.
 */
export type WorkspaceProjectConfig = {
    /**
     * The type of project it was added as.
     */
    type: AddType
};

/**
 * Configuration of a workspace.
 */
export type WorkspaceConfig = {
    /**
     * The name of the workspace.
     */
    name: string,
    /**
     * Flag to determine that the file was generated with the monux-cli.
     */
    isWorkspace: boolean,
    /**
     * The projects added with "mx add", by their name.
     * Missing in workspaces created before Monux recorded them.
     */
    projects?: Record<string, WorkspaceProjectConfig>
};
