import path from 'path';

import { ANGULAR_JSON_FILE_NAME, ANGULAR_ROUTES_FILE_NAME, APP_CONFIG_FILE_NAME, APPS_DIRECTORY_NAME, DEV_DOCKER_COMPOSE_FILE_NAME, DOCKER_COMPOSE_FILE_NAME, ENV_FILE_NAME, ENVIRONMENT_MODEL_TS_FILE_NAME, ENVIRONMENT_TS_FILE_NAME, ESLINT_CONFIG_FILE_NAME, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../../constants';
import { OmitStrict } from '../../types';

// eslint-disable-next-line jsdoc/require-jsdoc
export type MockConstants = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly PROJECT_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly APPS_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly LIBS_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly DOCKER_COMPOSE_YAML: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly DEV_DOCKER_COMPOSE_YAML: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_ESLINT_CONFIG_JS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_PACKAGE_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_NAME: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_COMPONENT_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_COMPONENT_HTML: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_ROUTES_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_ROUTES_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_APP_CONFIG_TS: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_ENVIRONMENT_MODEL: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ANGULAR_ENVIRONMENT: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly TS_LIBRARY_DIR: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly TS_LIBRARY_SCOPE: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly TS_LIBRARY_PACKAGE_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ROOT_PACKAGE_JSON: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly TS_LIBRARY_NAME: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly ENV: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly GLOBAL_ENV_MODEL: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    readonly GITHUB_WORKFLOW_DIR: string
};

// eslint-disable-next-line jsdoc/require-jsdoc
export type FileMockConstants = OmitStrict<
    MockConstants,
    'ANGULAR_APP_DIR' | 'APPS_DIR' | 'LIBS_DIR' | 'PROJECT_DIR' | 'TS_LIBRARY_DIR' | 'GITHUB_WORKFLOW_DIR'
    | 'ANGULAR_APP_NAME' | 'TS_LIBRARY_SCOPE' | 'TS_LIBRARY_NAME'
>;

// eslint-disable-next-line jsdoc/require-jsdoc
export type DirMockConstants = OmitStrict<
    MockConstants,
    keyof FileMockConstants | 'TS_LIBRARY_NAME' | 'ANGULAR_APP_NAME' | 'TS_LIBRARY_SCOPE'
>;

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
        DEV_DOCKER_COMPOSE_YAML: path.join(PROJECT_DIR, DEV_DOCKER_COMPOSE_FILE_NAME),
        ANGULAR_PACKAGE_JSON: path.join(ANGULAR_APP_DIR, PACKAGE_JSON_FILE_NAME),
        ANGULAR_ESLINT_CONFIG_JS: path.join(ANGULAR_APP_DIR, ESLINT_CONFIG_FILE_NAME),
        ANGULAR_APP_NAME: ANGULAR_APP_NAME,
        ANGULAR_APP_DIR: ANGULAR_APP_DIR,
        ANGULAR_APP_COMPONENT_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.ts'),
        ANGULAR_APP_COMPONENT_HTML: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.html'),
        ANGULAR_APP_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.routes.ts'),
        ANGULAR_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', ANGULAR_ROUTES_FILE_NAME),
        ANGULAR_APP_CONFIG_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', APP_CONFIG_FILE_NAME),
        ANGULAR_JSON: path.join(ANGULAR_APP_DIR, ANGULAR_JSON_FILE_NAME),
        ANGULAR_ENVIRONMENT: path.join(ANGULAR_APP_DIR, 'src', 'environment', ENVIRONMENT_TS_FILE_NAME),
        ANGULAR_ENVIRONMENT_MODEL: path.join(ANGULAR_APP_DIR, 'src', 'environment', ENVIRONMENT_MODEL_TS_FILE_NAME),
        TS_LIBRARY_NAME: TS_LIBRARY_NAME,
        TS_LIBRARY_DIR: TS_LIBRARY_DIR,
        TS_LIBRARY_SCOPE: `@${TS_LIBRARY_NAME}`,
        TS_LIBRARY_PACKAGE_JSON: path.join(TS_LIBRARY_DIR, PACKAGE_JSON_FILE_NAME),
        ROOT_PACKAGE_JSON: path.join(PROJECT_DIR, PACKAGE_JSON_FILE_NAME),
        ENV: path.join(PROJECT_DIR, ENV_FILE_NAME),
        GLOBAL_ENV_MODEL: path.join(PROJECT_DIR, GLOBAL_ENVIRONMENT_MODEL_FILE_NAME),
        GITHUB_WORKFLOW_DIR: path.join(PROJECT_DIR, '.github', 'workflows')
    } as const;
    return mockConstants;
}