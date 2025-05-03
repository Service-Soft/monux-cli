import { OmitStrict } from '../types';
import { ComposeService } from './compose-file.model';

// eslint-disable-next-line jsdoc/require-jsdoc
export type ParsedDockerComposeEnvironment = { [key: string]: string } | string[];

// eslint-disable-next-line jsdoc/require-jsdoc
export type ParsedDockerComposeServiceNetwork = string[] | Record<string, unknown>;

// eslint-disable-next-line jsdoc/require-jsdoc
export type ParsedDockerComposeService = OmitStrict<ComposeService, 'volumes' | 'environment' | 'networks' | 'ports'> & {
    // eslint-disable-next-line jsdoc/require-jsdoc
    volumes?: string[],
    // eslint-disable-next-line jsdoc/require-jsdoc
    environment?: ParsedDockerComposeEnvironment,
    // eslint-disable-next-line jsdoc/require-jsdoc
    networks?: ParsedDockerComposeServiceNetwork,
    // eslint-disable-next-line jsdoc/require-jsdoc
    ports?: string[]
};

// eslint-disable-next-line jsdoc/require-jsdoc
export type ParsedDockerCompose = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    version?: string,
    // eslint-disable-next-line jsdoc/require-jsdoc
    services?: {
        [serviceName: string]: ParsedDockerComposeService
    },
    // eslint-disable-next-line jsdoc/require-jsdoc
    volumes?: {
        [volumeName: string]: unknown
    },
    // eslint-disable-next-line jsdoc/require-jsdoc
    networks?: {
        [networkName: string]: unknown
    }
};