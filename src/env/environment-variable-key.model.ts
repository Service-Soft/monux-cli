import { DefaultEnvKeys } from './default-environment-keys';

/**
 * Default global environment variables.
 */
export type EnvironmentVariableKey =
    | typeof DefaultEnvKeys.ENV
    | typeof DefaultEnvKeys.PROD_ROOT_DOMAIN
    | typeof DefaultEnvKeys.STAGE_ROOT_DOMAIN
    | typeof DefaultEnvKeys.ACCESS_TOKEN_SECRET
    | typeof DefaultEnvKeys.REFRESH_TOKEN_SECRET
    | typeof DefaultEnvKeys.WEBSERVER_MAIL_USER
    | typeof DefaultEnvKeys.WEBSERVER_MAIL_PASSWORD
    | typeof DefaultEnvKeys.WEBSERVER_MAIL_HOST
    | typeof DefaultEnvKeys.WEBSERVER_MAIL_PORT;