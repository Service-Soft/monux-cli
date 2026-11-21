import { CorsOrigin } from 'zibri';

/**
 * Whether a url is one zibri takes as an origin.
 * @param url - The url.
 * @returns Whether it starts with http:// or https://.
 */
function isCorsOrigin(url: string): url is CorsOrigin {
    return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Turns the base urls of apps into the origins zibri allows.
 * @param appBaseUrls - The base urls of the apps, for the environment the api runs in.
 * @returns The origins.
 * @throws When a url is no http or https url.
 */
function resolveCorsOrigins(appBaseUrls: string[]): CorsOrigin[] {
    return appBaseUrls.map(url => {
        if (!isCorsOrigin(url)) {
            throw new Error(`The base url "${url}" of an app needs to be an http or https url.`);
        }
        return url;
    });
}

/**
 * The origins of the apps of the workspace that call this api from a browser. Monux adds the base url of every app it
 * generates for this api. With none, every origin may call it, which zibri allows by default.
 */
export const CORS_ORIGINS: CorsOrigin[] = resolveCorsOrigins([]);
