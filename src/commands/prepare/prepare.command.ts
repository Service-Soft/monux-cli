/* eslint-disable jsdoc/require-jsdoc */
import { STAGE_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { DbUtilities } from '../../db';
import { DockerComposeFileName } from '../../docker';
import { DockerTraefikUtilities } from '../../docker/docker-traefik.utilities';
import { InquirerUtilities, ProcessUtilities, PathUtilities } from '../../encapsulation';
import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { KeyValue } from '../../types';
import { BaseCommand } from '../base-command.model';
import { PrepareConfig, prepareConfigQuestions } from './prepare-config.model';

export class PrepareCommand extends BaseCommand<PrepareConfig> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(input: PrepareConfig): Promise<void> {
        await this.buildEnv(input.fileName, input.rootDir);
        await DbUtilities.createInitFiles(input.fileName, input.rootDir);
        if (input.fileName === STAGE_DOCKER_COMPOSE_FILE_NAME) {
            await DockerTraefikUtilities.createBasicAuthFile(input.rootDir);
        }
    }

    protected override async resolveInput(): Promise<PrepareConfig> {
        const fileName: DockerComposeFileName = (await InquirerUtilities.prompt(prepareConfigQuestions)).fileName;

        return {
            fileName,
            rootDir: PathUtilities.resolve('.')
        };
    }

    private async buildEnv(fileName: DockerComposeFileName, rootDir: string): Promise<void> {
        const validationErrors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(rootDir);
        if (validationErrors.length) {
            await ProcessUtilities.exitWithError(
                'The environment is not valid:\n'
                + validationErrors.map(e => `\t${e.key}: ${e.value}`).join('\n')
            );
        }
        await EnvUtilities.buildEnvironmentFiles(fileName, rootDir);
    }
}