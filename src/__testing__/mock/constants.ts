import path from 'path';

import { ANGULAR_JSON_FILE_NAME, ANGULAR_ROUTES_FILE_NAME, APPS_DIRECTORY_NAME, DOCKER_COMPOSE_FILE_NAME, ESLINT_CONFIG_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../constants';

// eslint-disable-next-line jsdoc/require-jsdoc
export type MockConstants = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    PROJECT_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    APPS_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    LIBS_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    DOCKER_COMPOSE_YAML: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ESLINT_CONFIG_JS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_APP_NAME: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_APP_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_COMPONENT_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_COMPONENT_HTML: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_APP_ROUTES_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_ROUTES_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_APP_CONFIG_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ANGULAR_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    TS_LIBRARY_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    TS_LIBRARY_SCOPE: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    TS_LIBRARY_PACKAGE_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ROOT_PACKAGE_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    TS_LIBRARY_NAME: string
};

/**
 * Generates mock constants for eg. Directory locations.
 * This is needed because every test needs it's own location
 * to not interfere with each other when running in parallel.
 * @param projectName - The name of the project folder inside the tmp directory. Must be unique.
 * @returns Constant values.
 */
export function getMockConstants(projectName: string): MockConstants {
    const TMP_DIR: string = path.join(__dirname, '..', 'tmp');
    const PROJECT_DIR: string = path.join(TMP_DIR, projectName);
    const APPS_DIR: string = path.join(PROJECT_DIR, APPS_DIRECTORY_NAME);
    const LIBS_DIR: string = path.join(PROJECT_DIR, LIBS_DIRECTORY_NAME);
    const ANGULAR_APP_NAME: string = 'angular';
    const ANGULAR_APP_DIR: string = path.join(APPS_DIR, ANGULAR_APP_NAME);
    const TS_LIBRARY_NAME: string = 'library';
    const TS_LIBRARY_DIR: string = path.join(LIBS_DIR, TS_LIBRARY_NAME);

    const mockConstants: MockConstants = {
        PROJECT_DIR: PROJECT_DIR,
        APPS_DIR: APPS_DIR,
        LIBS_DIR: LIBS_DIR,
        DOCKER_COMPOSE_YAML: path.join(PROJECT_DIR, DOCKER_COMPOSE_FILE_NAME),
        ESLINT_CONFIG_JS: path.join(PROJECT_DIR, ESLINT_CONFIG_FILE_NAME),
        ANGULAR_APP_NAME: ANGULAR_APP_NAME,
        ANGULAR_APP_DIR: ANGULAR_APP_DIR,
        ANGULAR_COMPONENT_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.ts'),
        ANGULAR_COMPONENT_HTML: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.html'),
        ANGULAR_APP_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.routes.ts'),
        ANGULAR_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', ANGULAR_ROUTES_FILE_NAME),
        ANGULAR_APP_CONFIG_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.config.ts'),
        ANGULAR_JSON: path.join(ANGULAR_APP_DIR, ANGULAR_JSON_FILE_NAME),
        TS_LIBRARY_NAME: TS_LIBRARY_NAME,
        TS_LIBRARY_DIR: TS_LIBRARY_DIR,
        TS_LIBRARY_SCOPE: `@${TS_LIBRARY_NAME}`,
        TS_LIBRARY_PACKAGE_JSON: path.join(TS_LIBRARY_DIR, PACKAGE_JSON_FILE_NAME),
        ROOT_PACKAGE_JSON: path.join(PROJECT_DIR, PACKAGE_JSON_FILE_NAME)
    } as const;
    return mockConstants;
}