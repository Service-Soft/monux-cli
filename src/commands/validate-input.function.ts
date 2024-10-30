import { Dirent } from 'fs';
import path from 'path';

import { FsUtilities } from '../encapsulation';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';
import { Command } from './command.enum';
import { exitWithError } from './exit-with-error.function';
import { PACKAGE_JSON_FILE_NAME } from '../constants';
import { PackageJson } from '../npm';

const allKnownCommands: Command[] = Object.values(Command);

/**
 * Validates the user input.
 * @param args - The arguments provided by the user for the cli-command.
 */
export async function validateInput(args: string[]): Promise<void> {
    if (args.length < 1) {
        exitWithError('Error: You need to specify a command.');
    }

    const command: Command = args[0] as Command;
    if (!allKnownCommands.includes(command) && args.length === 2) {
        await validateRunInput(args[0], args[1]);
        return;
    }

    if (!allKnownCommands.includes(command)) {
        exitWithError(`Error: Unknown command ${command}.`);
    }
    if (args.length > 1) {
        exitWithError('Error parsing the command: Too many arguments.');
    }
    if (command === Command.ADD || command === Command.A) {
        await validateInsideWorkspace();
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function validateRunInput(project: string, npmScript: string): Promise<void> {
    await validateInsideWorkspace();
    const foundProject: Dirent = await WorkspaceUtilities.findProjectOrFail(project);

    const foundProjectPath: string = path.join(foundProject.parentPath, foundProject.name);
    const packageJson: Dirent | undefined = (await FsUtilities.readdir(foundProjectPath)).find(f => f.name === PACKAGE_JSON_FILE_NAME);
    if (!packageJson) {
        exitWithError(`The provided project "${project}" does not contain a ${PACKAGE_JSON_FILE_NAME} file`);
        return;
    }
    const packageJsonPath: string = path.join(packageJson.parentPath, packageJson.name);
    const file: PackageJson = await FsUtilities.parseFileAs<PackageJson>(packageJsonPath);

    if (!Object.keys(file.scripts).includes(npmScript)) {
        exitWithError(`The project "${project}" does not contain the provided script "${npmScript}"`);
    }
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function validateInsideWorkspace(): Promise<void> {
    const config: WorkspaceConfig | undefined = await WorkspaceUtilities.getConfig();
    // eslint-disable-next-line typescript/strict-boolean-expressions
    if (!config?.isWorkspace) {
        exitWithError('This command can only be run inside a workspace');
    }
}