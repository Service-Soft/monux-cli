import path from 'path';

import { PACKAGE_JSON_FILE_NAME } from '../../constants';

const TMP_DIR: string = path.join(__dirname, '..', 'tmp');
const ANGULAR_APP_NAME: string = 'angular';
const ANGULAR_APP_DIR: string = path.join(TMP_DIR, 'apps', ANGULAR_APP_NAME);
const TS_LIBRARY_NAME: string = 'library';
const TS_LIBRARY_DIR: string = path.join(TMP_DIR, 'libs', TS_LIBRARY_NAME);

// eslint-disable-next-line jsdoc/require-jsdoc, typescript/typedef
export const mockConstants = {
    TMP_DIR: TMP_DIR,
    DOCKER_COMPOSE_YAML: path.join(TMP_DIR, 'docker-compose.yaml'),
    ESLINT_CONFIG_JS: path.join(TMP_DIR, 'eslint.config.js'),
    ANGULAR_APP_NAME: ANGULAR_APP_NAME,
    ANGULAR_APP_DIR: ANGULAR_APP_DIR,
    ANGULAR_COMPONENT_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.ts'),
    ANGULAR_COMPONENT_HTML: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.component.html'),
    ANGULAR_APP_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.routes.ts'),
    ANGULAR_ROUTES_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'routes.ts'),
    ANGULAR_APP_CONFIG_TS: path.join(ANGULAR_APP_DIR, 'src', 'app', 'app.config.ts'),
    TS_LIBRARY_DIR: TS_LIBRARY_DIR,
    TS_LIBRARY_SCOPE: `@${TS_LIBRARY_NAME}`,
    TS_LIBRARY_PACKAGE_JSON: path.join(TS_LIBRARY_DIR, PACKAGE_JSON_FILE_NAME),
    PACKAGE_JSON: path.join(TMP_DIR, PACKAGE_JSON_FILE_NAME)
} as const;