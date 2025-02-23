/**
 * The type of project to add.
 */
export enum AddType {
    ANGULAR = 'angular',
    ANGULAR_WEBSITE = 'angular-website',
    ANGULAR_LIBRARY = 'angular-library',
    LOOPBACK = 'loopback',
    TS_LIBRARY = 'ts-library',
    WORDPRESS = 'wordpress'
}

/**
 * BaseConfiguration for the add cli command.
 */
export type AddConfiguration = {
    /**
     * The type of project to add.
     */
    type: AddType,
    /**
     * The name of the new project.
     */
    name: string
};