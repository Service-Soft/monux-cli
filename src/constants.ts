import { Command } from './commands/command.enum';
import { ChalkUtilities } from './encapsulation';

/**
 * The base command of the cli.
 */
export const CLI_BASE_COMMAND: string = 'mx';

/**
 * The name of the workspace file.
 */
export const WORKSPACE_FILE_NAME: string = `${CLI_BASE_COMMAND}.workspace.json`;

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
 * The databases directory. Used to store startup configuration.
 */
export const DATABASES_DIRECTORY_NAME: string = 'databases';

/**
 * The name of the production docker compose file.
 */
export const PROD_DOCKER_COMPOSE_FILE_NAME: string = 'docker-compose.yaml';

/**
 * The name of the dev docker compose file.
 */
export const DEV_DOCKER_COMPOSE_FILE_NAME: string = 'dev.docker-compose.yaml';

/**
 * The name of the local docker compose file.
 */
export const LOCAL_DOCKER_COMPOSE_FILE_NAME: string = 'local.docker-compose.yaml';

/**
 * The name of the docker compose file.
 */
export const DOCKER_FILE_NAME: string = 'Dockerfile';

/**
 * The name of the .env file.
 */
export const ENV_FILE_NAME: string = '.env';

/**
 * The name of the environment.ts file.
 */
export const ENVIRONMENT_TS_FILE_NAME: string = 'environment.ts';

/**
 * The name of the environment.model.ts file.
 */
export const ENVIRONMENT_MODEL_TS_FILE_NAME: string = 'environment.model.ts';

/**
 * The name of the global-environment.model.ts.
 */
export const GLOBAL_ENVIRONMENT_MODEL_FILE_NAME: string = 'global-environment.model.ts';

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
 * The name of the angular app component file.
 */
export const ANGULAR_APP_COMPONENT_FILE_NAME: string = 'app.component.ts';

/**
 * Name of the .gitignore file.
 */
export const GIT_IGNORE_FILE_NAME: string = '.gitignore';

/**
 * Whether or not the project is currently public.
 */
// eslint-disable-next-line typescript/typedef
export const IS_PUBLIC_ENVIRONMENT_VARIABLE = 'is_public';

// /**
//  *
//  */
// // eslint-disable-next-line typescript/typedef
// export const ROOT_DOMAIN_ENVIRONMENT_VARIABLE = 'root_domain';

/**
 * The name of the robots txt file.
 */
export const ROBOTS_FILE_NAME: string = 'robots.txt';

/**
 * The name of the sitemap file.
 */
export const SITEMAP_FILE_NAME: string = 'sitemap.xml';

/**
 * The name of the angular app config file.
 */
export const APP_CONFIG_FILE_NAME: string = 'app.config.ts';

/**
 * The name of the angular ng package file.
 */
export const NG_PACKAGE_FILE_NAME: string = 'ng-package.json';

/**
 * The message to notify the user of the help command.
 */
export const MORE_INFORMATION_MESSAGE: string = `run ${ChalkUtilities.secondary(
    `${CLI_BASE_COMMAND} ${Command.HELP}`
)} for more information.`;

/**
 * Default global environment variables.
 */
export type GlobalEnvironmentVariable = typeof IS_PUBLIC_ENVIRONMENT_VARIABLE;