import { DockerComposeFileName } from '../constants';
import { DefaultEnvKeys } from '../env';
import { toSnakeCase } from '../utilities';

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
     * @returns The traefik docker labels for the service as an array of string.
     * @throws When the sub domain provided is www, as this is reserved.
     */
    static getTraefikLabels(
        projectName: string,
        port: number,
        composeFileName: DockerComposeFileName,
        subDomain: string | undefined
    ): string[] {
        if (subDomain === 'www') {
            throw new Error('The subdomain "www" is reserved and will be set automatically.');
        }

        switch (composeFileName) {
            case 'dev.docker-compose.yaml': {
                return [];
            }
            case 'local.docker-compose.yaml': {
                return this.getTraefikLabelsForLocal(projectName, subDomain, port);
            }
            case 'docker-compose.yaml': {
                return this.getTraefikLabelsForProd(projectName, subDomain, port);
            }
        }
    }

    private static getTraefikLabelsForProd(projectName: string, subDomain: string | undefined, port: number): string[] {
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
            'traefik.enable=true',
            `traefik.http.routers.${toSnakeCase(projectName)}.rule=${host}`,
            `traefik.http.routers.${toSnakeCase(projectName)}.entrypoints=web_secure`,
            `traefik.http.routers.${toSnakeCase(projectName)}.tls.certresolver=ssl_resolver`,
            `traefik.http.services.${toSnakeCase(projectName)}.loadbalancer.server.port=${port}`,
            'traefik.http.middlewares.compression.compress=true'
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
            'traefik.enable=true',
            `traefik.http.routers.${toSnakeCase(projectName)}.rule=${host}`,
            `traefik.http.routers.${toSnakeCase(projectName)}.entrypoints=web`,
            `traefik.http.services.${toSnakeCase(projectName)}.loadbalancer.server.port=${port}`,
            'traefik.http.middlewares.compression.compress=true'
        );
        labels.push(`traefik.http.routers.${toSnakeCase(projectName)}.middlewares=${middlewares.join(',')}`);
        return labels;
    }
}