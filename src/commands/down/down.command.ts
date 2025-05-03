import { getDockerServices } from '../../docker/get-docker-services.function';
import { FullyParsedDockerService } from '../../docker/stringified-docker-service.model';
import { CPUtilities } from '../../encapsulation';
import { exitWithError } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { DownConfiguration } from './down-configuration.model';

/**
 * Shuts down the monorepo.
 */
export class DownCommand extends BaseCommand<DownConfiguration> {
    protected override readonly insideWorkspace: boolean = true;
    protected override readonly maxLength: number = 2;

    protected override async run(input: DownConfiguration): Promise<void> {
        for (const filePath of input.dockerFilePaths) {
            await CPUtilities.exec(`docker compose -f ${filePath} -p ${input.projectName} stop`);
        }
    }

    protected override async validate(args: string[]): Promise<void> {
        await this.validateMaxLength(args);
        if (args.length === 1) {
            await this.validateInsideWorkspace();
        }
    }

    protected override async resolveInput(args: string[]): Promise<DownConfiguration> {
        const projectName: string = args.length === 1 ? (await WorkspaceUtilities.getConfigOrFail()).name : args[1];
        const dockerServices: FullyParsedDockerService[] = await getDockerServices(false);

        const dockerFilePaths: string[] = dockerServices
            .filter(d => d.config.name === projectName)
            .map(d => d.Labels['com.docker.compose.project.config_files'])
            .filter(d => d != undefined);

        if (!dockerFilePaths.length) {
            await exitWithError(`Error: Could not find any running docker services for "${projectName}"`);
        }

        return {
            dockerFilePaths: [...new Set(dockerFilePaths)],
            projectName
        };
    }
}