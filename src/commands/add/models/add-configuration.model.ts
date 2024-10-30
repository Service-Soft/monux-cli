/**
 *
 */
export enum AddType {
    ANGULAR = 'angular',
    ANGULAR_WEBSITE = 'angular-website',
    ANGULAR_LIBRARY = 'angular-library',
    LOOPBACK = 'loopback',
    TS_LIBRARY = 'ts-library'
}

/**
 *
 */
export type AddConfiguration = {
    /**
     *
     */
    type: AddType,
    /**
     *
     */
    name: string
};