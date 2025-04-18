/* eslint-disable jsdoc/require-jsdoc */
import { PrepareConfig, prepareConfigQuestions } from './prepare-config.model';
import { DockerComposeFileName } from '../../constants';
import { DbUtilities } from '../../db';
import { InquirerUtilities } from '../../encapsulation';
import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { RobotsUtilities } from '../../robots';
import { KeyValue } from '../../types';
import { exitWithError, getPath } from '../../utilities';
import { BaseCommand } from '../base-command.model';

export class PrepareCommand extends BaseCommand<PrepareConfig> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(input: PrepareConfig): Promise<void> {
        await this.buildEnv(input.fileName, input.rootDir);
        await RobotsUtilities.createRobotsTxtFiles(input.fileName, input.rootDir);
        await DbUtilities.createInitFiles(input.fileName, input.rootDir);
    }

    protected override async resolveInput(): Promise<PrepareConfig> {
        const fileName: DockerComposeFileName = (await InquirerUtilities.prompt(prepareConfigQuestions)).fileName;

        return {
            fileName,
            rootDir: getPath('.')
        };
    }

    private async buildEnv(fileName: DockerComposeFileName, rootDir: string): Promise<void> {
        const validationErrors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(rootDir);
        if (validationErrors.length) {
            exitWithError(
                'Error when validating the .env file:\n'
                + validationErrors.map(e => `\t${e.key}: ${e.value}`).join('\n')
            );
        }
        await EnvUtilities.buildEnvironmentFiles(fileName, rootDir);
    }
}