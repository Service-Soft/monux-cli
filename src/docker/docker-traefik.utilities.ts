import { DEV_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME } from '../constants';
import { DefaultEnvKeys } from '../env';
import { toSnakeCase } from '../utilities';
import { DockerComposeFileName } from './docker-compose-file-name.model';

/**
 * The traefik docker socket volume. Is needed for traefik to take control of routing.
 */
export const TRAEFIK_DOCKER_SOCK_VOLUME: string = '/var/run/docker.sock:/var/run/docker.sock:ro';

/**
 * The traefik label for enabling routing for that docker service.
 */
export const TRAEFIK_ENABLE_LABEL: string = 'traefik.enable=true';

/**
 * The traefik label for enabling compression.
 */
export const TRAEFIK_COMPRESSION_LABEL: string = 'traefik.http.middlewares.compression.compress=true';

/**
 * The traefik docker image, with version.
 */
export const TRAEFIK_DOCKER_IMAGE: string = 'traefik:v3.2';

/**
 * The base traefik commands.
 * Includes things such as http and https ports etc.
 */
export const TRAEFIK_BASE_DOCKER_COMMANDS: string[] = [
    '--providers.docker=true',
    '--providers.docker.exposedbydefault=false',
    '--entryPoints.web.address=:80',
    '--entryPoints.websecure.address=:443'
];

/**
 * Encapsulates functionality for getting docker traefik labels.
 */
export abstract class DockerTraefikUtilities {

    /**
     * Gets the traefik labels for the project with the given name.
     * @param projectName - The name of the project to get the labels for.
     * @param port - The port where the service runs in development.
     * @param composeFileName - The name of the compose file to get the traefik labels for.
     * @param subDomain - The sub domain of the service.
     * @param useBasicAuth - ONLY VALID FOR THE STAGE DOCKER COMPOSE FILE. Whether or not to use basic auth.
     * @returns The traefik docker labels for the service as an array of string.
     * @throws When the sub domain provided is www, as this is reserved.
     */
    static getTraefikLabels(
        projectName: string,
        port: number,
        composeFileName: DockerComposeFileName,
        subDomain: string | undefined,
        useBasicAuth: boolean
    ): string[] {
        if (subDomain === 'www') {
            throw new Error('The subdomain "www" is reserved and will be set automatically.');
        }

        switch (composeFileName) {
            case DEV_DOCKER_COMPOSE_FILE_NAME: {
                return [];
            }
            case LOCAL_DOCKER_COMPOSE_FILE_NAME: {
                return this.getTraefikLabelsForLocal(projectName, subDomain, port);
            }
            case STAGE_DOCKER_COMPOSE_FILE_NAME: {
                return this.getTraefikLabelsForStage(projectName, subDomain, port, useBasicAuth);
            }
            case PROD_DOCKER_COMPOSE_FILE_NAME: {
                return this.getTraefikLabelsForProd(projectName, subDomain, port);
            }
        }
    }

    private static getTraefikLabelsForStage(
        projectName: string,
        subDomain: string | undefined,
        port: number,
        traefikBasicAuth: boolean
    ): string[] {
        let host: string = `Host(\`\${${DefaultEnvKeys.subDomain(projectName)}}.\${${DefaultEnvKeys.STAGE_ROOT_DOMAIN}}\`)`;
        const labels: string[] = [];
        const middlewares: string[] = ['compression'];
        if (traefikBasicAuth) {
            labels.push('traefik.http.middlewares.auth.basicauth.usersfile=/config/.htpasswd');
            middlewares.push('auth');
        }
        if (!subDomain) {
            host = `Host(\`\${${DefaultEnvKeys.STAGE_ROOT_DOMAIN}}\`) || Host(\`www.\${${DefaultEnvKeys.STAGE_ROOT_DOMAIN}}\`)`;
            labels.push(
                'traefik.http.middlewares.wwwredirect.redirectregex.regex=^https://www\.(.*)',
                'traefik.http.middlewares.wwwredirect.redirectregex.replacement=https://$${1}'
            );
            middlewares.push('wwwredirect');
        }
        labels.push(
            TRAEFIK_ENABLE_LABEL,
            `traefik.http.routers.${toSnakeCase(projectName)}.rule=${host}`,
            `traefik.http.routers.${toSnakeCase(projectName)}.entrypoints=web_secure`,
            `traefik.http.routers.${toSnakeCase(projectName)}.tls.certresolver=ssl_resolver`,
            `traefik.http.services.${toSnakeCase(projectName)}.loadbalancer.server.port=${port}`,
            TRAEFIK_COMPRESSION_LABEL
        );
        labels.push(`traefik.http.routers.${toSnakeCase(projectName)}.middlewares=${middlewares.join(',')}`);
        return labels;
    }

    private static getTraefikLabelsForProd(
        projectName: string,
        subDomain: string | undefined,
        port: number
    ): string[] {
        let host: string = `Host(\`\${${DefaultEnvKeys.subDomain(projectName)}}.\${${DefaultEnvKeys.PROD_ROOT_DOMAIN}}\`)`;
        const labels: string[] = [];
        const middlewares: string[] = ['compression'];
        if (!subDomain) {
            host = `Host(\`\${${DefaultEnvKeys.PROD_ROOT_DOMAIN}}\`) || Host(\`www.\${${DefaultEnvKeys.PROD_ROOT_DOMAIN}}\`)`;
            labels.push(
                'traefik.http.middlewares.wwwredirect.redirectregex.regex=^https://www\.(.*)',
                'traefik.http.middlewares.wwwredirect.redirectregex.replacement=https://$${1}'
            );
            middlewares.push('wwwredirect');
        }
        labels.push(
            TRAEFIK_ENABLE_LABEL,
            `traefik.http.routers.${toSnakeCase(projectName)}.rule=${host}`,
            `traefik.http.routers.${toSnakeCase(projectName)}.entrypoints=web_secure`,
            `traefik.http.routers.${toSnakeCase(projectName)}.tls.certresolver=ssl_resolver`,
            `traefik.http.services.${toSnakeCase(projectName)}.loadbalancer.server.port=${port}`,
            TRAEFIK_COMPRESSION_LABEL
        );
        labels.push(`traefik.http.routers.${toSnakeCase(projectName)}.middlewares=${middlewares.join(',')}`);
        return labels;
    }

    private static getTraefikLabelsForLocal(projectName: string, subDomain: string | undefined, port: number): string[] {
        let host: string = `Host(\`\${${DefaultEnvKeys.subDomain(projectName)}}.localhost\`)`;
        const labels: string[] = [];
        const middlewares: string[] = ['compression'];
        if (!subDomain) {
            host = 'Host(`localhost`) || Host(`www.localhost`)';
            labels.push(
                'traefik.http.middlewares.wwwredirect.redirectregex.regex=^http://www\.(.*)',
                'traefik.http.middlewares.wwwredirect.redirectregex.replacement=http://$${1}'
            );
            middlewares.push('wwwredirect');
        }
        labels.push(
            TRAEFIK_ENABLE_LABEL,
            `traefik.http.routers.${toSnakeCase(projectName)}.rule=${host}`,
            `traefik.http.routers.${toSnakeCase(projectName)}.entrypoints=web`,
            `traefik.http.services.${toSnakeCase(projectName)}.loadbalancer.server.port=${port}`,
            TRAEFIK_COMPRESSION_LABEL
        );
        labels.push(`traefik.http.routers.${toSnakeCase(projectName)}.middlewares=${middlewares.join(',')}`);
        return labels;
    }
}