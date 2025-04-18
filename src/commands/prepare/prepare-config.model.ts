import { DockerComposeFileName } from '../../constants';
import { QuestionsFor } from '../../encapsulation';

/**
 * Configuration for the prepare command.
 */
export type PrepareConfig = {
    /**
     * The name of the docker file/environment to use.
     */
    fileName: DockerComposeFileName,
    /**
     * The root directory of the monorepo to prepare.
     */
    rootDir: string
};

// eslint-disable-next-line jsdoc/require-jsdoc
const choices: { name: string, value: DockerComposeFileName }[] = [
    { name: 'dev', value: 'dev.docker-compose.yaml' },
    { name: 'local', value: 'local.docker-compose.yaml' },
    { name: 'prod', value: 'docker-compose.yaml' }
];

/**
 * Questions for getting the environment to run in.
 */
export const prepareConfigQuestions: QuestionsFor<Omit<PrepareConfig, 'dockerFilePath' | 'rootDir'>> = {
    fileName: {
        message: 'env',
        type: 'select',
        choices: choices
    }
};