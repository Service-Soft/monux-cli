/**
 *
 */
type PackageJsonExportEntry = {
    /**
     *
     */
    types: string,
    /**
     *
     */
    import: string,
    /**
     *
     */
    require: string
};

/**
 * Model for a package.json file.
 */
export type PackageJson = {
    /**
     *
     */
    name: string,
    /**
     *
     */
    files?: string[],
    /**
     *
     */
    module?: string,
    /**
     *
     */
    exports?: Record<string, PackageJsonExportEntry>,
    /**
     * The scripts inside the file.
     */
    scripts: Record<string, string>,
    /**
     * The workspaces section inside the file.
     */
    workspaces?: string[],
    /**
     * The main entry file. Usually something like dist/index.js.
     */
    main: string,
    /**
     * Dependencies of the package.
     */
    dependencies: Record<string, string>,
    /**
     * DevDependencies of the package.
     */
    devDependencies: Record<string, string>,
    /**
     * PeerDependencies of the package.
     */
    peerDependencies?: Record<string, string>
};