import { execSync } from 'child_process';

import { DockerLabel } from '.';
import { WORKSPACE_FILE_NAME } from '../constants';
import { JsonUtilities } from '../encapsulation';
import { getPath } from '../utilities';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';
import { FullyParsedDockerService, isFullyParsedDockerService, StringifiedDockerService, StringifiedDockerServiceWithParsedLabels } from './stringified-docker-service.model';

/**
 * Gets all docker services that come from a project with an mx.workspace.json.
 * @param all - Whether or not to get all docker services.
 * @returns An Array of grouped docker services.
 */
export async function getDockerServices(all: boolean): Promise<FullyParsedDockerService[]> {
    const output: string = execSync(`docker ps${all ? ' -a' : ''} --format "{{json .}}" --size=false`)
        .toString()
        .trim();

    // Split the output into lines and parse each JSON line.
    const services: StringifiedDockerServiceWithParsedLabels[] = await Promise.all(output
        .split('\n')
        .filter(line => line)
        .map(async line => {
            const service: StringifiedDockerService = JsonUtilities.parse(line);
            const labels: Record<string, string | undefined> = parseLabels(service.Labels);
            const config: WorkspaceConfig | undefined = await getWorkspaceConfig(labels);
            return {
                ...service,
                Labels: labels,
                config: config
            };
        }));

    return services.filter(isFullyParsedDockerService);
}

/**
 * Gets the workspace project for a docker service with the given labels.
 * @param labels - The docker labels of the service to get the workspace config for.
 * @returns The found workspace config or undefined.
 */
async function getWorkspaceConfig(labels: Record<DockerLabel, string | undefined>): Promise<WorkspaceConfig | undefined> {
    const composeProjectDir: string | undefined = labels[DockerLabel.COMPOSE_PROJECT_DIR];
    if (!composeProjectDir) {
        return undefined;
    }
    const config: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig(getPath(composeProjectDir, WORKSPACE_FILE_NAME));
    return config;
}

/**
 * Parses the labels of a docker service.
 * @param labelStr - The raw labels string value.
 * @returns A record with the label as key and the label value.
 */
function parseLabels(labelStr: string): Record<string, string | undefined> {
    return labelStr.split(',')
        .reduce<Record<string, string | undefined>>((acc, pair) => {
            if (!pair) {
                return acc;
            }
            const [key, ...value] = pair.split('=');
            acc[key.trim()] = value.join('').trim();
            return acc;
        }, {});
}