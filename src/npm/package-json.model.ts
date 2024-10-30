/**
 *
 */
export type PackageJson = {
    /**
     *
     */
    scripts: Record<string, string>,
    /**
     *
     */
    workspaces?: string[],
    /**
     *
     */
    main: string
};