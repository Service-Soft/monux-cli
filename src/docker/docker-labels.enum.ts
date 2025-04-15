/**
 * The known labels of a docker service.
 */
export enum DockerLabel {
    COMPOSE_FILE_PATH = 'com.docker.compose.project.config_files',
    COMPOSE_SERVICE_NAME = 'com.docker.compose.service',
    COMPOSE_PROJECT_DIR = 'com.docker.compose.project.working_dir'
}