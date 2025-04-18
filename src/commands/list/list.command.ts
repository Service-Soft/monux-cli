import path from 'path';

import { CLI_BASE_COMMAND } from '../../constants';
import { DockerLabel, FullyParsedDockerService } from '../../docker';
import { getDockerServices } from '../../docker/get-docker-services.function';
import { ChalkUtilities, CliTable, CliTableUtilities } from '../../encapsulation';
import { BaseCommand } from '../base-command.model';
import { DockerServiceStatus } from './docker-service-status.model';

/**
 * Lists the docker services grouped by their monorepo.
 */
export class ListCommand extends BaseCommand {
    constructor(private readonly all: boolean) {
        super();
    }

    protected override async run(): Promise<void> {
        const services: FullyParsedDockerService[] = await getDockerServices(this.all);
        if (!services.length) {
        // eslint-disable-next-line no-console
            console.log('No running services found.');
            if (!this.all) {
            // eslint-disable-next-line no-console, sonar/no-nested-template-literals
                console.log(`You can call ${ChalkUtilities.secondary(`${CLI_BASE_COMMAND} la`)} to also see stopped services.`);
            }
            // eslint-disable-next-line no-console
            console.log();
        }
        const grouped: Record<string, FullyParsedDockerService[]> = this.groupByMonorepo(services);

        for (const key in grouped) {
            const services: FullyParsedDockerService[] = grouped[key];
            const data: CliTable = {
                title: key,
                headers: ['Name', 'Type', 'Status', 'environment'],
                rows: services.map(s => {
                    const { label, color } = this.getStatus(s);
                    return [
                        this.getName(s, color),
                        this.getType(s, color),
                        label,
                        this.getEnv(s.Labels, color)
                    ];
                })
            };

            CliTableUtilities.logTable(data);
        }
    }

    private getStatus(s: FullyParsedDockerService): DockerServiceStatus {
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

    private getName(service: FullyParsedDockerService, color: 'success' | 'error' | undefined): string {
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

    private getEnv(labels: Record<DockerLabel, string | undefined>, color: 'error' | 'success' | undefined): string {
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

    private groupByMonorepo(services: FullyParsedDockerService[]): Record<string, FullyParsedDockerService[]> {
        return services.reduce<Record<string, FullyParsedDockerService[]>>((acc, svc) => {
            const repo: string = svc.config.name;
            acc[repo] = acc[repo] ?? [];
            acc[repo].push(svc);
            return acc;
        }, {});
    }

    private getType(s: FullyParsedDockerService, color: 'error' | 'success' | undefined): string {
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
}