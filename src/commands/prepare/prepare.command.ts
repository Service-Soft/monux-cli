/* eslint-disable jsdoc/require-jsdoc */
import { DockerComposeFileName } from '../../constants';
import { DbUtilities } from '../../db';
import { InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { RobotsUtilities } from '../../robots';
import { KeyValue } from '../../types';
import { exitWithError } from '../exit-with-error.function';

export type PrepareConfig = {
    fileName: DockerComposeFileName
};

const choices: { name: string, value: DockerComposeFileName }[] = [
    { name: 'dev', value: 'dev.docker-compose.yaml' },
    { name: 'local', value: 'local.docker-compose.yaml' },
    { name: 'prod', value: 'docker-compose.yaml' }
];
const prepareConfigQuestions: QuestionsFor<PrepareConfig> = {
    fileName: {
        message: 'env',
        type: 'select',
        choices: choices
    }
};

/**
 * Prepares everything that is needed to be done for deploying the monorepo.
 * @param fileName - The docker compose file get the variables for.
 */
export async function runPrepare(fileName: DockerComposeFileName | undefined): Promise<void> {
    if (!fileName) {
        fileName = (await InquirerUtilities.prompt(prepareConfigQuestions)).fileName;
    }
    await buildEnv(fileName);
    await buildRobotsTxtFiles(fileName);
    await buildDbInitFiles(fileName);
}

async function buildDbInitFiles(fileName: DockerComposeFileName): Promise<void> {
    await DbUtilities.createInitFiles(fileName);
}

async function buildEnv(fileName: DockerComposeFileName): Promise<void> {
    const validationErrors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate();
    if (validationErrors.length) {
        exitWithError(
            'Error when validating the .env file:\n'
            + validationErrors.map(e => `\t${e.key}: ${e.value}`).join('\n')
        );
        return;
    }
    await EnvUtilities.buildEnvironmentFiles(fileName);
}

async function buildRobotsTxtFiles(fileName: DockerComposeFileName): Promise<void> {
    await RobotsUtilities.createRobotsTxtFiles(fileName);
}