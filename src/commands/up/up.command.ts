import { dirname } from 'path';

import { DockerComposeFileName } from '../../constants';
import { FullyParsedDockerService, getDockerServices } from '../../docker';
import { CPUtilities, InquirerUtilities } from '../../encapsulation';
import { exitWithError, getPath } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { PrepareCommand, prepareConfigQuestions } from '../prepare';
import { UpConfiguration } from './up-configuration.model';

/**
 * Starts monorepo services.
 * Also calls the prepare command.
 */
export class UpCommand extends BaseCommand<UpConfiguration> {
    protected override readonly insideWorkspace: boolean = true;
    protected override readonly maxLength: number = 2;

    protected override async run(input: UpConfiguration): Promise<void> {
        await new PrepareCommand()['run'](input);
        CPUtilities.execSync(`docker compose -f ${input.dockerFilePath ?? input.fileName} -p ${input.projectName} up --build -d`);
    }

    protected override async validate(args: string[]): Promise<void> {
        this.validateMaxLength(args);
        if (args.length === 1) {
            await this.validateInsideWorkspace();
        }
    }

    protected override async resolveInput(args: string[]): Promise<UpConfiguration> {
        const projectName: string = args.length === 1 ? (await WorkspaceUtilities.getConfigOrFail()).name : args[1];
        const dockerServices: FullyParsedDockerService[] = await getDockerServices(true);
        const service: FullyParsedDockerService | undefined = dockerServices.find(d => d.config.name === projectName);

        let rootDir: string | undefined = service?.Labels['com.docker.compose.project.working_dir'];
        if (args.length === 1) {
            rootDir = getPath('.');
        }
        if (rootDir === undefined) {
            exitWithError(`Error: Could not find root of "${projectName}"`);
        }

        const fileName: DockerComposeFileName = (await InquirerUtilities.prompt(prepareConfigQuestions)).fileName;
        const dockerFilePath: string | undefined = this.getDockerFilePath(service, fileName);
        return {
            fileName,
            projectName,
            dockerFilePath,
            rootDir
        };
    }

    private getDockerFilePath(service: FullyParsedDockerService | undefined, fileName: DockerComposeFileName): string | undefined {
        const dockerFilePath: string | undefined = service?.Labels['com.docker.compose.project.config_files'];
        if (dockerFilePath === undefined) {
            return undefined;
        }
        return getPath(dirname(dockerFilePath), fileName);
    }
}