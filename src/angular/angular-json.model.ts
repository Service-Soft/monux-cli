
/**
 * Definition for including assets inside of an angular project.
 */
export interface AngularJsonAssetPattern {
    /**
     * The glob pattern to match files to include as assets.
     */
    glob: string,
    /**
     * The input path where the assets are located.
     * Typically a relative path to the source directory.
     */
    input: string,
    /**
     * The output path where the matched assets will be placed in the build output.
     * Typically a relative path to the output directory.
     */
    output: string
}

/**
 * Represents a style entry in an Angular workspace configuration (`angular.json`).
 */
interface AngularJsonStyleElement {
    /**
     * Path to the stylesheet file to include in the build.
     */
    input: string,
    /**
     * Determines whether the style is injected into the HTML automatically.
     * If true, the stylesheet will be included as a <link> tag in the index.html.
     * Defaults to true if not specified.
     */
    inject?: boolean,
    /**
     * Optional name for the bundle created from the stylesheet.
     * Used when generating the output style file.
     */
    bundleName?: string,
    /**
     * Indicates whether the stylesheet is loaded lazily.
     * If true, the stylesheet is not included in the main bundle and is loaded dynamically.
     */
    lazy?: boolean
}

/**
 * Definition for a script element.
 */
interface AngularJsonScriptElement {
    /**
     * Path to the script file to include in the build.
     */
    input: string,
    /**
     * Determines whether the script is injected into the HTML automatically.
     * If true, the script will be included as a <script> tag in the index.html.
     * Defaults to true if not specified.
     */
    inject?: boolean,
    /**
     * Optional name for the bundle created from the script.
     * Used when generating the output script file.
     */
    bundleName?: string,
    /**
     * Indicates whether the script is loaded lazily.
     * If true, the script is not included in the main bundle and is loaded dynamically.
     */
    lazy?: boolean
}

/**
 * Options for an entry in the architects section.
 */
interface AngularJsonArchitectOptions {
    /**
     * Where the built output should be placed.
     */
    outputPath?: string,
    /**
     * The main file.
     */
    main?: string,
    /**
     * Path to the tsConfig file to use.
     */
    tsConfig?: string,
    /**
     * Polyfills to include.
     */
    polyfills?: string,
    /**
     * Assets to include.
     */
    assets?: AngularJsonAssetPattern[],
    /**
     * Stylesheets to include.
     */
    styles?: AngularJsonStyleElement[],
    /**
     * Scripts to include.
     */
    scripts?: AngularJsonScriptElement[],
    [option: string]: unknown // For extra properties
}

/**
 * Definition for an angular.json architect section.
 */
interface AngularJsonArchitectDefinition {
    /**
     * The builder to use.
     */
    builder: string,
    /**
     * Options for the architect.
     */
    options?: AngularJsonArchitectOptions,
    /**
     * The different configurations that can be used.
     */
    configurations?: Record<string, AngularJsonArchitectOptions>,
    /**
     * The default configuration to use.
     */
    defaultConfiguration?: string
}

/**
 * Options for an angular project schematic.
 */
interface AngularJsonSchematicOptions {
    /**
     * Name of the schematic.
     */
    name?: string,
    /**
     * Path of the schematic.
     */
    path?: string,
    /**
     * Project of the schematic.
     */
    project?: string,
    /**
     * Prefix for the schematic.
     */
    prefix?: string,
    /**
     * Style for the schematic.
     */
    style?: 'css' | 'scss' | 'sass' | 'less',
    /**
     * Whether or not to use inlineTemplates.
     */
    inlineTemplate?: boolean,
    /**
     * Whether or not to use inline styles.
     */
    inlineStyle?: boolean,
    /**
     * Whether or not to skip tests.
     */
    skipTests?: boolean,
    /**
     * Whether or not to use routing.
     */
    routing?: boolean,
    [option: string]: unknown // For additional properties in custom schematics
}

/**
 * Definition for a single angular.json project.
 */
interface AngularJsonProject {
    /**
     * The root of the project.
     */
    root: string,
    /**
     * The root of the .
     */
    sourceRoot?: string,
    /**
     * The type of the project.
     */
    projectType: 'application' | 'library',
    /**
     * The prefix to add to eg. Generated components.
     */
    prefix?: string,
    /**
     * Architect options for build, serve etc.
     */
    architect?: Record<string, AngularJsonArchitectDefinition>,
    /**
     * Schematics used in ng generate.
     */
    schematics?: Record<string, AngularJsonSchematicOptions>
}

/**
 * Definition for an angular.json file.
 */
export interface AngularJson {
    /**
     * The json schema.
     */
    $schema: string,
    /**
     * The version of the angular.json.
     */
    version: number,
    /**
     * Where new projects should be generated.
     */
    newProjectRoot: string,
    /**
     * Options for the projects of the angular project.
     */
    projects: Record<string, AngularJsonProject>
}