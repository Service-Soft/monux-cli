import { DefaultEnvKeys } from './default-environment-keys';

/**
 * Default global environment variables.
 */
export type EnvironmentVariableKey = typeof DefaultEnvKeys.IS_PUBLIC | typeof DefaultEnvKeys.PROD_ROOT_DOMAIN;