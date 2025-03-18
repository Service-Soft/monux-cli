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
    isWorkspace: boolean
};