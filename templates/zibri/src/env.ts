import { AppPage } from '{{=contractPackage}}';

import { environment } from './environment/environment';

/**
 * The variables zibri reads, by the names it reads them by.
 *
 * Their values come from the environment of the workspace: the .env and .env.public at its root, typed by its
 * global-environment.model.ts and narrowed to what this api declares in environment/environment.model.ts. "mx prepare"
 * writes them next to this project for the environment it runs in, and docker compose passes them to the container.
 */
const variables: Record<string, string | undefined> = {
    ENVIRONMENT: environment.env === 'dev' ? 'development' : 'production',
    // inside a container every api listens on 3000, which traefik forwards to
    PORT: environment.env === 'dev' ? String(environment.{{=prefix}}_port) : '3000',
    BASE_URL: environment.{{=prefix}}_base_url,
    DB_HOST: environment.{{=dbHostKey}},
    DB_PORT: '5432',
    DB_USERNAME: environment.{{=dbUserKey}},
    DB_PASSWORD: environment.{{=dbPasswordKey}},
    DB_DATABASE: environment.{{=dbNameKey}},
    // the database is reached inside the network of docker compose, or on the machine of the developer
    DB_SSL: 'false',
    JWT_ACCESS_SECRET: environment.{{=prefix}}_jwt_access_secret,
    JWT_REFRESH_SECRET: environment.{{=prefix}}_jwt_refresh_secret,
    MASTER_KEY: environment.{{=prefix}}_master_key,
    DEFAULT_ADMIN_EMAIL: environment.{{=prefix}}_default_user_email,
    DEFAULT_ADMIN_PASSWORD: environment.{{=prefix}}_default_user_password,
    // the pages of an app that set a new password and accept an invitation, which the mails link to. "mx add" points
    // them at the app it adds for this api. Until then they are urls of the api, which has no such pages
    CONFIRM_PASSWORD_RESET_URL: `${environment.{{=prefix}}_base_url}/${AppPage.CONFIRM_PASSWORD_RESET}`,
    ACCEPT_INVITATION_URL: `${environment.{{=prefix}}_base_url}/${AppPage.ACCEPT_INVITATION}`,
    SMTP_HOST: environment.webserver_mail_host,
    SMTP_PORT: environment.webserver_mail_port == undefined ? undefined : String(environment.webserver_mail_port),
    SMTP_USER: environment.webserver_mail_user,
    SMTP_PASSWORD: environment.webserver_mail_password,
    EMAIL_DEFAULT_SENDER: environment.webserver_mail_user
};

/**
 * Reads a variable the application cannot run without.
 * @param key - The name of the variable.
 * @returns Its value.
 * @throws When it is unset or empty, naming the variable.
 */
export function requireEnv(key: string): string {
    const value: string | undefined = variables[key];
    if (value == undefined || value === '') {
        throw new Error(`The environment variable "${key}" is not set. Set it in the .env of the workspace and run "mx prepare".`);
    }
    return value;
}

/**
 * Reads a yes-or-no variable the application cannot run without.
 * @param key - The name of the variable, which holds "true" or "false".
 * @returns Whether it is "true".
 * @throws When it is anything but "true" or "false", naming the variable.
 */
export function requireBooleanEnv(key: string): boolean {
    const value: string = requireEnv(key);
    if (value !== 'true' && value !== 'false') {
        throw new Error(`The environment variable "${key}" needs to be "true" or "false", got "${value}".`);
    }
    return value === 'true';
}

/**
 * Reads a variable the application cannot run without, which holds one of a few values.
 * @param key - The name of the variable.
 * @param values - The values it may hold.
 * @returns Its value.
 * @throws When it is unset, empty or none of the values, naming the variable and the values.
 */
export function requireOneOfEnv<T extends string>(key: string, values: readonly T[]): T {
    const value: string = requireEnv(key);
    const known: T | undefined = values.find(candidate => candidate === value);
    if (known == undefined) {
        throw new Error(`The environment variable "${key}" needs to be one of ${values.join(', ')}, got "${value}".`);
    }
    return known;
}

/**
 * Reads a port the application cannot run without.
 * @param key - The name of the variable.
 * @returns The port.
 * @throws When it is unset or no whole number from 1 to 65535, naming the variable.
 */
export function requirePortEnv(key: string): number {
    const value: string = requireEnv(key);
    const port: number = Number(value);
    if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
        throw new Error(`The environment variable "${key}" needs to be a port from 1 to 65535, got "${value}".`);
    }
    return port;
}

/**
 * Reads an http or https url the application cannot run without.
 * @param key - The name of the variable.
 * @returns The url, as it is written.
 * @throws When it is unset or no absolute http or https url, naming the variable.
 */
export function requireUrlEnv(key: string): string {
    const value: string = requireEnv(key);
    let protocol: string | undefined;
    try {
        protocol = new URL(value).protocol;
    }
    catch {
        protocol = undefined;
    }
    if (protocol !== 'http:' && protocol !== 'https:') {
        throw new Error(`The environment variable "${key}" needs to be an http or https url, got "${value}".`);
    }
    return value;
}

/**
 * Reads a variable the application runs without.
 * @param key - The name of the variable.
 * @returns Its value, or an empty string when it is unset.
 */
export function optionalEnv(key: string): string {
    return variables[key] ?? '';
}
