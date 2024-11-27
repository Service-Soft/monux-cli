import { ChalkUtilities } from './encapsulation';

/**
 * The base command of the cli.
 */
export const CLI_BASE_COMMAND: string = 'mr';

/**
 * The name of the workspace file.
 */
export const WORKSPACE_FILE_NAME: string = 'mr.workspace.json';

/**
 * The name of the package json file.
 */
export const PACKAGE_JSON_FILE_NAME: string = 'package.json';

/**
 * The name of the directory where all projects that can be started as webservers are found.
 */
export const APPS_DIRECTORY_NAME: string = 'apps';

/**
 * The name of the directory where all the libraries can be found.
 */
export const LIBS_DIRECTORY_NAME: string = 'libs';

/**
 * The name of the docker compose file.
 */
export const DOCKER_COMPOSE_FILE_NAME: string = 'docker-compose.yaml';

/**
 * The name of the eslint config file.
 */
export const ESLINT_CONFIG_FILE_NAME: string = 'eslint.config.js';

/**
 * The name of the tailwind config file.
 */
export const TAILWIND_CONFIG_FILE_NAME: string = 'tailwind.config.js';

/**
 * The name of the ts config file.
 */
export const TS_CONFIG_FILE_NAME: string = 'tsconfig.json';

/**
 * The name of the angular json file.
 */
export const ANGULAR_JSON_FILE_NAME: string = 'angular.json';

/**
 * The name of the angular routes file.
 */
export const ANGULAR_ROUTES_FILE_NAME: string = 'routes.ts';

/**
 * The message to notify the user of the help command.
 */
export const MORE_INFORMATION_MESSAGE: string = `run ${ChalkUtilities.secondary(
    `${CLI_BASE_COMMAND} help` // TODO: Why is Command?.HELP undefined here?
)} for more information.`;