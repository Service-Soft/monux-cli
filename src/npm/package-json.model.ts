/**
 * Export entry in the package json.
 * Mostly used for declaring .d.ts files in libraries.
 */
type PackageJsonExportEntry = {
    /**
     * Path to the root type declaration file, eg. Index.d.ts.
     */
    types: string,
    /**
     * Path esm root file, eg. Index.js or shared.js.
     */
    import: string,
    /**
     * Path to the common js root file, eg. Index.umd.cjs or shared.umd.cjs.
     */
    require: string
};

/**
 * Model for a package.json file.
 */
export type PackageJson = {
    /**
     * The name of the package.
     */
    name: string,
    /**
     * Files that should be included in the package.
     */
    files?: string[],
    /**
     * Whether or not the package is using modules.
     */
    module?: string,
    /**
     * Object to configure what to export and in which way.
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
     * Path to the type definition file.
     */
    types?: string,
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