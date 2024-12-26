/* eslint-disable jsdoc/require-jsdoc */
import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { RobotsUtilities } from '../../robots';
import { KeyValue } from '../../types';
import { exitWithError } from '../exit-with-error.function';

/**
 * Prepares everything that is needed to be done for deploying the monorepo.
 */
export async function runPrepare(): Promise<void> {
    await buildEnv();
    await buildRobotsTxtFiles();
}

async function buildEnv(): Promise<void> {
    const validationErrors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate();
    if (validationErrors.length) {
        exitWithError(
            'Error when validating the .env file:\n'
            + validationErrors.map(e => `\t${e.key}: ${e.value}`).join('\n')
        );
    }
    await EnvUtilities.buildEnvironmentFiles();
}

async function buildRobotsTxtFiles(): Promise<void> {
    await RobotsUtilities.createRobotsTxtFiles();
}