import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { KeyValue } from '../../types';
import { exitWithError } from '../exit-with-error.function';

/**
 * Builds the environment files based on the root .env file.
 */
export async function runBuildEnv(): Promise<void> {
    const validationErrors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate();
    if (validationErrors.length) {
        exitWithError(
            'Error when validating the .env file:\n'
            + validationErrors.map(e => `\t${e.key}: ${e.value}`).join('\n')
        );
    }
    await EnvUtilities.buildEnvironmentFiles();
}