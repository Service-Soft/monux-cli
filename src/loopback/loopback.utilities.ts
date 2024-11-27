import { CPUtilities } from '../encapsulation';
import { optionsToCliString } from '../utilities';
import { LbDatabaseConfig } from './lb-database-config.model';

/**
 * Generates a database connection for the api.
 */
type CliGenerateDb = `datasource ${string}`;

/**
 * The command consists of only the new project name.
 */
type CliNew = `new ${string}`;

/**
 * Configuration options for generating a new loopback application.
 */
type NewConfig = {
    /**
     * Description of the application.
     */
    description?: string,
    /**
     * Project root directory for the application.
     */
    outdir?: string,
    /**
     * Whether or not to add eslint.
     */
    eslint?: boolean,
    /**
     * Whether or not to add prettier.
     */
    prettier?: boolean,
    /**
     * Whether or not to add mocha.
     */
    mocha?: boolean,
    /**
     * Whether or not to include loopbackBuild.
     */
    loopbackBuild?: boolean,
    /**
     * Whether or not to generate vscode config files.
     */
    vscode?: boolean,
    /**
     * Whether or not to generate a docker file.
     */
    docker?: boolean
};

/**
 * Options for the new command of the loopback cli.
 */
type NewOptions = {
    /**
     * A configuration object.
     */
    '--config'?: NewConfig,
    /**
     * At the current stage, this must be set to true so that jest of mr cli does not interfere with mocha from the loopback tests.
     */
    '--skip-install'?: boolean,
    /**
     * Whether or not to select all default values for which no configuration has been provided.
     */
    '--yes'?: boolean
};

/**
 * Options for the generate datasource command of the loopback cli.
 */
type GenerateDbOptions = {
    /**
     * A configuration object.
     */
    '--config': LbDatabaseConfig
};

/**
 * All possible loopback cli commands.
 */
type LoopbackCliCommands = CliGenerateDb | CliNew;

/**
 * Possible angular cli options, narrowed down based on the provided command.
 */
type LoopbackCliOptions<T extends LoopbackCliCommands> =
    T extends CliGenerateDb ? GenerateDbOptions
        : T extends CliNew ? NewOptions
            : never;

/**
 * Utilities for loopback.
 */
export abstract class LoopbackUtilities {
    private static readonly CLI_VERSION: number = 6;

    /**
     * Runs an loopback cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static runCommand(directory: string, command: LoopbackCliCommands, options: LoopbackCliOptions<typeof command>): void {
        if (command.startsWith('new ')) {
            // for the new command, extract the name
            command = command.split(' ')[1] as LoopbackCliCommands;
        }
        CPUtilities.execSync(`cd ${directory} && npx @loopback/cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options, ' ')}`);
    }
}