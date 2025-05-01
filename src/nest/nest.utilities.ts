import { ModuleMetadata } from '@nestjs/common';

import { CPUtilities, FsUtilities, JsonUtilities } from '../encapsulation';
import { TsUtilities } from '../ts';
import { DeepPartial } from '../types';
import { mergeDeep, optionsToCliString, Path } from '../utilities';
import { NestCliJson } from './nest-cli-json.model';

/**
 * The `nest new {}` command.
 */
type CliNew = `new ${string}`;

/**
 * All possible nest cli commands.
 */
type NestCliCommands = CliNew;

/**
 * Cli Options for running ng new.
 */
type NewOptions = {
    /**
     * Whether or not npm install should be skipped.
     */
    '--skip-install': true,
    /**
     * Whether or not git initialization should be skipped.
     */
    '--skip-git': true,
    /**
     * The package manager to use.
     */
    '--package-manager': 'npm',
    /**
     * The language to use.
     */
    '--language': 'TS'
};

/**
 * Possible nest cli options, narrowed down based on the provided command.
 */
type NestCliOptions<T extends NestCliCommands> =
    T extends CliNew ? NewOptions
        : never;

/**
 * Utilities for nest specific code generation/manipulation.
 */
export abstract class NestUtilities {

    private static readonly CLI_VERSION: number = 11;

    /**
     * Runs an nest cli command inside the provided directory.
     * @param directory - The directory to run the command inside.
     * @param command - The command to run.
     * @param options - Options for running the command.
     */
    static async runCommand(directory: Path, command: NestCliCommands, options: NestCliOptions<typeof command>): Promise<void> {
        await CPUtilities.exec(`cd ${directory} && npx @nestjs/cli@${this.CLI_VERSION} ${command} ${optionsToCliString(options)}`);
    }

    /**
     * Updates an nest-cli.json.
     * @param path - The path of the nest-cli.json.
     * @param data - The data to update with.
     */
    static async updateNestCliJson(path: Path, data: DeepPartial<NestCliJson>): Promise<void> {
        const oldData: NestCliJson = await FsUtilities.parseFileAs(path);
        const updatedData: NestCliJson = mergeDeep(oldData, data);
        await FsUtilities.updateFile(path, JsonUtilities.stringify(updatedData), 'replace', false);
    }

    /**
     * Adds a import to the provided module.
     * @param modulePath - The path of the module where the import should be added.
     * @param imports - The imports to add.
     */
    static async addModuleImports(
        modulePath: Path,
        imports: ModuleMetadata['imports']
    ): Promise<void> {
        if (imports === undefined) {
            return;
        }
        const { result, contentString } = await TsUtilities.getArrayStartingWith(modulePath, 'imports: [');

        result.push(...imports);

        const stringifiedArray: string = ` ${JsonUtilities.stringifyAsTs(result, 4)}`;

        await FsUtilities.replaceInFile(
            modulePath,
            contentString,
            stringifiedArray
        );
    }
}