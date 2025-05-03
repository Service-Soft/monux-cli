import { dirname } from 'path';

import { DockerComposeFileName, FullyParsedDockerService, getDockerServices } from '../../docker';
import { CPUtilities, InquirerUtilities } from '../../encapsulation';
import { exitWithError, getPath } from '../../utilities';
import { WorkspaceUtilities } from '../../workspace';
import { BaseCommand } from '../base-command.model';
import { PrepareCommand, prepareConfigQuestions } from '../prepare';
import { UpConfiguration } from './up-configuration.model';
import { ENV_FILE_NAME, ENV_PUBLIC_FILE_NAME } from '../../constants';

/**
 * Starts monorepo services.
 * Also calls the prepare command.
 */
export class UpCommand extends BaseCommand<UpConfiguration> {
    protected override readonly insideWorkspace: boolean = true;
    protected override readonly maxLength: number = 2;

    protected override async run(input: UpConfiguration): Promise<void> {
        await new PrepareCommand()['run'](input);
        const dockerFile: string = input.dockerFilePath ?? input.fileName;
        const options: string = `-f ${dockerFile} -p ${input.projectName} --env-file ${ENV_FILE_NAME} --env-file ${ENV_PUBLIC_FILE_NAME}`;
        await CPUtilities.exec(`docker compose ${options} up --build -d`);
    }

    protected override async validate(args: string[]): Promise<void> {
        await this.validateMaxLength(args);
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
            return await exitWithError(`Error: Could not find root of "${projectName}"`);
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