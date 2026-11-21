import { ChildProcess, spawn } from 'node:child_process';
import { ClientRequest, IncomingMessage, request as httpRequest } from 'node:http';
import { request as httpsRequest, RequestOptions as HttpsRequestOptions } from 'node:https';

import { UpCommand } from '../../commands/up';
import { DockerComposeFileName } from '../../docker';
import { CPUtilities, Path, PathUtilities } from '../../encapsulation';
import { EnvUtilities, EnvValidationErrorMessage } from '../../env';
import { KeyValue } from '../../types';
import { WorkspaceUtilities } from '../../workspace';

/**
 * What a service of a running workspace answered.
 */
export type ServiceResponse = {
    /**
     * The status of the answer, 0 while nothing answers.
     */
    status: number,
    /**
     * The body of the answer.
     */
    body: string
};

/**
 * A request to a service of a running workspace, through traefik or to the port of a process.
 */
export type ServiceRequest = {
    /**
     * The host the request names, which traefik routes by, such as "api.localhost".
     */
    host: string,
    /**
     * The path of the request.
     */
    path: string,
    /**
     * The port on this machine: 80 or 443 of traefik, or the one of a process.
     */
    port: number,
    /**
     * Whether the request is made with https, whose certificate is not checked: traefik of stage and prod serves its
     * default one while letsencrypt can't reach a test.
     */
    https?: boolean,
    /**
     * The fields of a form the request posts, like a browser does. Without them, the request is a GET.
     */
    form?: Record<string, string>,
    /**
     * The user and the password of basic auth.
     */
    auth?: {
        // eslint-disable-next-line jsdoc/require-jsdoc
        user: string,
        // eslint-disable-next-line jsdoc/require-jsdoc
        password: string
    }
};

/**
 * A process a test started, such as an api in development.
 */
export type RunningProcess = {
    /**
     * Stops the process.
     */
    stop: () => void
};

// how long a test waits for a service to answer as expected, such as an image that builds and a database that starts
const WAIT_TIMEOUT_IN_MS: number = 120_000;

/**
 * Starts the services of a test workspace with docker compose, the way "mx up" does, and asks them what a developer
 * would ask them. Needs Docker.
 */
export abstract class RunningWorkspaceUtilities {
    /**
     * Starts the services of a compose file the way "mx up" does: prepares the environment, builds the images and
     * starts the containers.
     * @param fileName - The compose file.
     */
    static async up(fileName: DockerComposeFileName): Promise<void> {
        // what mx up refuses with an exit, which a test would wait for until its timeout, as jest keeps the output open
        const errors: KeyValue<EnvValidationErrorMessage>[] = await EnvUtilities.validate(PathUtilities.resolve('.'));
        if (errors.length) {
            throw new Error(`The environment is not valid: ${errors.map(e => `${e.key} ${e.value}`).join(', ')}`);
        }
        await new UpCommand()['run']({
            fileName,
            projectName: await this.resolveProjectName(),
            dockerFilePath: undefined,
            rootDir: PathUtilities.resolve('.')
        });
    }

    /**
     * Stops the services of a compose file and removes their containers. The volumes are kept, unless asked otherwise,
     * so a restart shows what survives one.
     * @param fileName - The compose file.
     * @param removeVolumes - Whether the volumes are removed as well, as a test does once it is done.
     */
    static async down(fileName: DockerComposeFileName, removeVolumes: boolean): Promise<void> {
        const options: string = removeVolumes ? ' -v --remove-orphans' : '';
        await CPUtilities.exec(`docker compose -f ${fileName} -p ${await this.resolveProjectName()} down${options}`);
    }

    /**
     * Runs a command inside the container of a service.
     * @param fileName - The compose file the service is started from.
     * @param service - The name of the service.
     * @param command - The command, run with sh.
     * @returns What the command printed.
     */
    static async execInService(fileName: DockerComposeFileName, service: string, command: string): Promise<string> {
        const projectName: string = await this.resolveProjectName();
        return await CPUtilities.resolveOutput(
            `docker compose -f ${fileName} -p ${projectName} exec -T ${service} sh -c ${JSON.stringify(command)}`
        );
    }

    /**
     * Sends a request to a service, through traefik or to the port of a process. A service that does not answer yet
     * is answered with the status 0.
     * @param serviceRequest - Where the request goes.
     * @returns What the service answered.
     */
    static async request(serviceRequest: ServiceRequest): Promise<ServiceResponse> {
        const credentials: string | undefined = serviceRequest.auth == undefined
            ? undefined
            : Buffer.from(`${serviceRequest.auth.user}:${serviceRequest.auth.password}`).toString('base64');
        const form: string | undefined = serviceRequest.form == undefined ? undefined : new URLSearchParams(serviceRequest.form).toString();
        // the options of https, which add the name the certificate is asked for to the ones of http
        const options: HttpsRequestOptions = {
            host: '127.0.0.1',
            port: serviceRequest.port,
            path: serviceRequest.path,
            method: form == undefined ? 'GET' : 'POST',
            headers: {
                host: serviceRequest.host,
                ...credentials == undefined ? {} : { authorization: `Basic ${credentials}` },
                ...form == undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded' }
            },
            servername: serviceRequest.host,
            rejectUnauthorized: false
        };
        return await new Promise(resolve => {
            const onResponse: (response: IncomingMessage) => void = response => {
                let body: string = '';
                response.setEncoding('utf8');
                response.on('data', (chunk: string) => body += chunk);
                response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
            };
            const outgoing: ClientRequest = serviceRequest.https === true
                ? httpsRequest(options, onResponse)
                : httpRequest(options, onResponse);
            outgoing.on('error', () => resolve({ status: 0, body: '' }));
            outgoing.end(form);
        });
    }

    /**
     * Sends a request until its answer is the expected one, such as while an image builds or a database starts.
     * @param serviceRequest - Where the request goes.
     * @param isExpected - Whether an answer is the expected one.
     * @returns The expected answer.
     * @throws When the answer is not the expected one in time, with the last answer.
     */
    static async waitFor(serviceRequest: ServiceRequest, isExpected: (response: ServiceResponse) => boolean): Promise<ServiceResponse> {
        const end: number = Date.now() + WAIT_TIMEOUT_IN_MS;
        let response: ServiceResponse = await this.request(serviceRequest);
        while (!isExpected(response) && Date.now() < end) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            response = await this.request(serviceRequest);
        }
        if (!isExpected(response)) {
            throw new Error(
                `${serviceRequest.host}${serviceRequest.path} answered ${response.status} in the end: ${response.body.slice(0, 500)}`
            );
        }
        return response;
    }

    /**
     * Runs a command until it succeeds, such as one that needs a database that is still starting.
     * @param command - The command.
     * @throws The error of its last run, when it does not succeed in time.
     */
    static async waitForCommand(command: string): Promise<void> {
        const end: number = Date.now() + WAIT_TIMEOUT_IN_MS;
        for (;;) {
            try {
                await CPUtilities.exec(command, false);
                return;
            }
            catch (error) {
                if (Date.now() >= end) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Starts a process of a project, such as an api in development, which runs until it is stopped.
     * @param projectPath - The directory of the project, which the process runs in.
     * @param args - The arguments of node, such as the file of the api.
     * @returns The running process.
     */
    static startNodeProcess(projectPath: Path, args: string[]): RunningProcess {
        const process: ChildProcess = spawn(globalThis.process.execPath, args, { cwd: projectPath, stdio: 'ignore' });
        return { stop: () => process.kill() };
    }

    private static async resolveProjectName(): Promise<string> {
        return (await WorkspaceUtilities.getConfigOrFail()).name;
    }
}