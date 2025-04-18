/* eslint-disable no-console */
import { PACKAGE_JSON_FILE_NAME } from '../../constants';
import { ChalkUtilities, FsUtilities } from '../../encapsulation';
import { PackageJson } from '../../npm';
import { getPath, exitWithError } from '../../utilities';
import { BaseCommand } from '../base-command.model';

/**
 * Prints out the currently used version of Monux.
 */
export class VersionCommand extends BaseCommand {
    protected override async run(): Promise<void> {
        const packageJsonPath: string = getPath(__dirname, '..', '..', '..', PACKAGE_JSON_FILE_NAME);
        const pkg: PackageJson = await FsUtilities.parseFileAs(packageJsonPath);
        if (!pkg.version) {
            exitWithError('Could not determine the currently running version of Monux');
            return;
        }
        console.log(ChalkUtilities.boldUnderline('Version:'));
        console.log(ChalkUtilities.secondary(pkg.version));
    }
}