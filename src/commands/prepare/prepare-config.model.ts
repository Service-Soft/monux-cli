import { DEV_DOCKER_COMPOSE_FILE_NAME, LOCAL_DOCKER_COMPOSE_FILE_NAME, PROD_DOCKER_COMPOSE_FILE_NAME, STAGE_DOCKER_COMPOSE_FILE_NAME } from '../../constants';
import { DockerComposeFileName } from '../../docker';
import { QuestionsFor } from '../../encapsulation';
import { EnvValue } from '../../env';

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

const choices: Record<EnvValue, DockerComposeFileName> = {
    [EnvValue.DEV]: DEV_DOCKER_COMPOSE_FILE_NAME,
    [EnvValue.LOCAL]: LOCAL_DOCKER_COMPOSE_FILE_NAME,
    [EnvValue.STAGE]: STAGE_DOCKER_COMPOSE_FILE_NAME,
    [EnvValue.PROD]: PROD_DOCKER_COMPOSE_FILE_NAME
};

/**
 * Questions for getting the environment to run in.
 */
export const prepareConfigQuestions: QuestionsFor<Omit<PrepareConfig, 'dockerFilePath' | 'rootDir'>> = {
    fileName: {
        message: 'env',
        type: 'select',
        choices: Object.entries(choices).map(choice => ({ name: choice[0], value: choice[1] }))
    }
};