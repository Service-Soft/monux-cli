/**
 * Model of the ng-package.json file content.
 */
export interface NgPackageJson {
    /**
     * The json schema.
     */
    $schema: string,
    /**
     * The path where the compiled output should be placed.
     */
    dest: string,
    /**
     * Library options.
     */
    lib: {
        /**
         * The libraries entry file.
         */
        entryFile: string
    }
}