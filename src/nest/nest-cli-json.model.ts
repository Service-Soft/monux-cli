/**
 * Model of the nest-cli.json file content.
 */
export interface NestCliJson {
    /**
     * Options for compiling the project.
     */
    compilerOptions: {
        /**
         * The bundler to use.
         */
        builder: 'tsc' | 'webpack' | 'swc'
    }
}