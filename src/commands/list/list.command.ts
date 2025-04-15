import path from 'path';

import { getDockerServices } from './get-docker-services.function';
import { FullyParsedDockerService } from './stringified-docker-service.model';
import { CLI_BASE_COMMAND } from '../../constants';
import { DockerLabel } from '../../docker';
import { ChalkUtilities, CliTable, CliTableUtilities } from '../../encapsulation';

/**
 * Status of a docker service.
 * Consists of a label and an optional color.
 */
type DockerServiceStatus = {
    /**
     * The label of the status.
     */
    label: string,
    /**
     * The color that should be used to highlight the service, eg. For errors.
     */
    color: 'error' | 'success' | undefined
};

/**
 * Runs the list command of the cli.
 * This gives information about any docker services that are managed by Monux.
 * @param all - Whether to list all services or only the ones currently running.
 */
export async function runList(all: boolean): Promise<void> {
    const services: FullyParsedDockerService[] = await getDockerServices(all);
    if (!services.length) {
        // eslint-disable-next-line no-console
        console.log('No running services found.');
        if (!all) {
            // eslint-disable-next-line no-console, sonar/no-nested-template-literals
            console.log(`You can call ${ChalkUtilities.secondary(`${CLI_BASE_COMMAND} la`)} to also see stopped services.`);
        }
        // eslint-disable-next-line no-console
        console.log();
    }
    const grouped: Record<string, FullyParsedDockerService[]> = groupByMonorepo(services);

    for (const key in grouped) {
        const services: FullyParsedDockerService[] = grouped[key];
        const data: CliTable = {
            title: key,
            headers: ['Name', 'Type', 'Status', 'environment'],
            rows: services.map(s => {
                const { label, color } = getStatus(s);
                return [
                    getName(s, color),
                    getType(s, color),
                    label,
                    getEnv(s.Labels, color)
                ];
            })
        };

        CliTableUtilities.logTable(data);
    }
}

/**
 * Gets the status of a docker service.
 * @param s - The service to get the status for.
 * @returns Label and color of the status.
 */
function getStatus(s: FullyParsedDockerService): DockerServiceStatus {
    if (s.Status.startsWith('Exited')) {
        const exitCode: string = s.Status.split('Exited (')[1].split(')')[0];
        const time: string = s.Status.split(') ')[1];

        if (exitCode === '0') {
            return { label: `Stopped (${time})`, color: undefined };
        }
        return { label: ChalkUtilities.error(`Crashed (${time}) with ${exitCode}`), color: 'error' };
    }

    if (s.Status.startsWith('Up')) {
        const time: string = s.Status.split('Up ')[1];
        return { label: ChalkUtilities.success(`Running (${time})`), color: 'success' };
    }

    return { label: s.Status, color: undefined };
}

/**
 * Gets the name of the given docker service.
 * @param service - The docker service to get the name for.
 * @param color - An optional color to highlight the row.
 * @returns The service name if found, the container name otherwise.
 */
function getName(service: FullyParsedDockerService, color: 'success' | 'error' | undefined): string {
    const res: string = service.Labels['com.docker.compose.service'] ?? service.Names;
    switch (color) {
        case 'success': {
            return ChalkUtilities.success(res);
        }
        case 'error': {
            return ChalkUtilities.error(res);
        }
        case undefined: {
            return res;
        }
    }
}

/**
 * Gets the environment that the service was run in.
 * @param labels - The labels of the service to get the environment from.
 * @param color - An optional color to highlight the row.
 * @returns 'dev', 'prod', 'local' or '-', when no environment could be determined.
 */
function getEnv(labels: Record<DockerLabel, string | undefined>, color: 'error' | 'success' | undefined): string {
    const dockerFile: string | undefined = labels['com.docker.compose.project.config_files'];
    let res: 'local' | 'prod' | 'dev' | '-' = '-';
    if (!dockerFile) {
        switch (color) {
            case 'success': {
                return ChalkUtilities.success(res);
            }
            case 'error': {
                return ChalkUtilities.error(res);
            }
            case undefined: {
                return res;
            }
        }
    }
    const fileName: string = path.basename(dockerFile);
    if (fileName === 'docker-compose.yaml' || fileName === 'docker-compose.yml') {
        res = 'prod';
    }
    if (fileName.startsWith('dev.')) {
        res = 'dev';
    }
    if (fileName.startsWith('local.')) {
        res = 'local';
    }

    if (res === '-') {
        // eslint-disable-next-line no-console
        console.error(ChalkUtilities.error('Could not determine environment for the docker compose file', fileName));
    }

    switch (color) {
        case 'success': {
            return ChalkUtilities.success(res);
        }
        case 'error': {
            return ChalkUtilities.error(res);
        }
        case undefined: {
            return res;
        }
    }
}

/**
 * Groups the given docker services by the monorepo that they belong to.
 * @param services - The services to group.
 * @returns A record with the name of the monorepo and the docker services that belong to them.
 */
function groupByMonorepo(services: FullyParsedDockerService[]): Record<string, FullyParsedDockerService[]> {
    return services.reduce<Record<string, FullyParsedDockerService[]>>((acc, svc) => {
        const repo: string = svc.config.name;
        acc[repo] = acc[repo] ?? [];
        acc[repo].push(svc);
        return acc;
    }, {});
}

/**
 * Gets the type (image) of the service.
 * @param s - The service to get the type of.
 * @param color - An optional color to highlight the row.
 * @returns The name of the image used by that service.
 */
function getType(s: FullyParsedDockerService, color: 'error' | 'success' | undefined): string {
    switch (color) {
        case 'success': {
            return ChalkUtilities.success(s.Image);
        }
        case 'error': {
            return ChalkUtilities.error(s.Image);
        }
        case undefined: {
            return s.Image;
        }
    }
}