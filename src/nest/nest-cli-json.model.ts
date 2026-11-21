/**
 * Model of the nest-cli.json file content.
 */
export interface NestCliJson {
    /**
     * The file "nest start" runs, relative to the output folder, without its extension. "main" by default.
     */
    entryFile?: string,
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