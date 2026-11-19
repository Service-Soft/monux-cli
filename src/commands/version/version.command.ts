import { PACKAGE_JSON_FILE_NAME } from '../../constants';
import { ChalkUtilities, FsUtilities, LogUtilities, PathUtilities, ProcessUtilities, Path } from '../../encapsulation';
import { PackageJson } from '../../npm';
import { BaseCommand } from '../base-command.model';

/**
 * Prints out the currently used version of Monux.
 */
export class VersionCommand extends BaseCommand {
    protected override async run(): Promise<void> {
        const packageJsonPath: Path = PathUtilities.resolve(__dirname, '..', '..', '..', PACKAGE_JSON_FILE_NAME);
        const pkg: PackageJson = await FsUtilities.parseFileAs(packageJsonPath);
        if (!pkg.version) {
            return await ProcessUtilities.exitWithError('Could not determine the version of Monux');
        }
        LogUtilities.heading('Version:');
        LogUtilities.text(ChalkUtilities.secondary(pkg.version));
    }
}