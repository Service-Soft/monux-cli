import { CLI_BASE_COMMAND, DEV_DOCKER_COMPOSE_FILE_NAME, ENV_FILE_NAME, ENV_PUBLIC_FILE_NAME } from '../../constants';
import { DockerComposeFileName, DockerUtilities, FullyParsedDockerService } from '../../docker';
import { CPUtilities, InquirerUtilities, ProcessUtilities, PathUtilities } from '../../encapsulation';
import { WorkspaceUtilities } from '../../workspace';
import { UnrecordedZibriVersion, ZibriUtilities } from '../../zibri';
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
        await this.validateZibriVersions(input);
        const dockerFile: string = input.dockerFilePath ?? input.fileName;
        const options: string = `-f ${dockerFile} -p ${input.projectName} --env-file ${ENV_FILE_NAME} --env-file ${ENV_PUBLIC_FILE_NAME}`;
        await CPUtilities.exec(`docker compose ${options} up --build -d`);
    }

    /**
     * Refuses to start the images of zibri apis that would stop right away, as their "versions" folder does not record
     * the version they run. In development the api runs on the machine and records it itself.
     * @param input - What to start.
     */
    private async validateZibriVersions(input: UpConfiguration): Promise<void> {
        if (input.fileName === DEV_DOCKER_COMPOSE_FILE_NAME) {
            return;
        }
        const unrecorded: UnrecordedZibriVersion[] = await ZibriUtilities.findUnrecordedVersions(input.rootDir);
        if (unrecorded.length) {
            await ProcessUtilities.exitWithError(
                unrecorded.map(u => `The "versions" folder of ${u.project} does not record its version ${u.version} as the latest.`)
                    .join('\n')
                    + '\nIts image only reads the record. Start it once in development, which records the version, and commit the folder.'
            );
        }
    }

    protected override async validate(args: string[]): Promise<void> {
        await this.validateMaxLength(args);
        if (args.length === 1) {
            await this.validateInsideWorkspace();
        }
    }

    protected override async resolveInput(args: string[]): Promise<UpConfiguration> {
        const projectName: string = args.length === 1 ? (await WorkspaceUtilities.getConfigOrFail()).name : args[1];
        const dockerServices: FullyParsedDockerService[] = await DockerUtilities.findServices(true);
        const service: FullyParsedDockerService | undefined = dockerServices.find(d => d.config.name === projectName);

        const rootDir: string | undefined = args.length === 1
            ? PathUtilities.resolve('.')
            : service?.Labels['com.docker.compose.project.working_dir'];
        if (rootDir === undefined) {
            return await ProcessUtilities.exitWithError(
                `Could not find the workspace "${projectName}".`
                + ` Run ${CLI_BASE_COMMAND} la to see every workspace with docker services.`
            );
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
        return dockerFilePath === undefined ? undefined : PathUtilities.resolve(PathUtilities.getDirectory(dockerFilePath), fileName);
    }
}