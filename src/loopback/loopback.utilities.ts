import { CPUtilities, Path } from '../encapsulation';
import { optionsToCliString } from '../utilities';

/**
 * What "lb4 app" generates, as its --config takes it.
 */
type NewConfig = {
    /**
     * Whether it lints with the eslint config of LoopBack.
     */
    eslint?: boolean,
    /**
     * Whether it formats with prettier.
     */
    prettier?: boolean,
    /**
     * Whether it tests with mocha.
     */
    mocha?: boolean,
    /**
     * Whether it builds with @loopback/build.
     */
    loopbackBuild?: boolean,
    /**
     * Whether it gets the settings of vscode.
     */
    vscode?: boolean,
    /**
     * Whether it gets a Dockerfile of LoopBack.
     */
    docker?: boolean,
    /**
     * Whether its application has the RepositoryMixin, and the migrate script.
     */
    repositories?: boolean,
    /**
     * Whether its application has the ServiceMixin.
     */
    services?: boolean
};

/**
 * Options of "lb4 app".
 */
type NewOptions = {
    /**
     * Takes the defaults instead of asking.
     */
    '--yes'?: boolean,
    /**
     * What the project gets.
     */
    '--config'?: NewConfig
};

/**
 * Utilities for loopback.
 */
export abstract class LoopbackUtilities {

    // 8.0.1 generates a project whose own dependencies do not resolve: @loopback/boot 9.0.1 wants @loopback/core ^7,
    // the project gets ^8. The workspace is generated with the latest 7 until LoopBack fixes that
    private static readonly CLI_VERSION: string = '7.0.17';

    /**
     * Creates a LoopBack project with "lb4 app".
     * @param directory - The directory to create the project in.
     * @param name - The name of the project.
     * @param options - What the project gets.
     */
    static async createProject(directory: Path, name: string, options: NewOptions): Promise<void> {
        const cliOptions: string = optionsToCliString(options, ' ');
        await CPUtilities.exec(`cd ${directory} && npx --yes @loopback/cli@${this.CLI_VERSION} app ${name} ${cliOptions}`);
    }
}