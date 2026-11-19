import { CLI_BASE_COMMAND } from '../../constants';
import { DockerLabel, DockerUtilities, FullyParsedDockerService, isDockerComposeFileName } from '../../docker';
import { ChalkUtilities, CliTable, CliTableUtilities, LogUtilities, PathUtilities } from '../../encapsulation';
import { EnvValue, envValueForDockerComposeFileName } from '../../env';
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
        const services: FullyParsedDockerService[] = await DockerUtilities.findServices(this.all);
        if (!services.length) {
            LogUtilities.text(this.all ? 'No services found.' : 'No running services found.');
            if (!this.all) {
                // eslint-disable-next-line sonar/no-nested-template-literals
                LogUtilities.text(`Run ${ChalkUtilities.exampleUsage(`${CLI_BASE_COMMAND} la`)} to also see stopped services.`);
            }
            LogUtilities.newLine();
        }
        const grouped: Record<string, FullyParsedDockerService[]> = this.groupByMonorepo(services);

        for (const key in grouped) {
            const servicesOfMonorepo: FullyParsedDockerService[] = grouped[key];
            const data: CliTable = {
                title: key,
                headers: ['Name', 'Type', 'Status', 'environment'],
                rows: servicesOfMonorepo.map(s => {
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

            return exitCode === '0'
                ? { label: `Stopped (${time})`, color: undefined }
                : { label: ChalkUtilities.error(`Crashed (${time}) with ${exitCode}`), color: 'error' };
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
        if (!dockerFile) {
            switch (color) {
                case 'success': {
                    return ChalkUtilities.success('-');
                }
                case 'error': {
                    return ChalkUtilities.error('-');
                }
                case undefined: {
                    return '-';
                }
            }
        }
        const fileName: string = PathUtilities.getName(dockerFile);
        const res: EnvValue | '-' = isDockerComposeFileName(fileName) ? envValueForDockerComposeFileName[fileName] : '-';
        if (res === '-') {
            LogUtilities.warning(`Could not determine the environment of the docker compose file "${fileName}"`);
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