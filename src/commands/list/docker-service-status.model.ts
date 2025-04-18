/**
 * Status of a docker service.
 * Consists of a label and an optional color.
 */
export type DockerServiceStatus = {
    /**
     * The label of the status.
     */
    label: string,
    /**
     * The color that should be used to highlight the service, eg. For errors.
     */
    color: 'error' | 'success' | undefined
};