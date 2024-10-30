import { AddConfiguration } from '../models/add-configuration.model';
import { AddTsLibraryCommand } from './add-ts-library.command';

/**
 *
 * @param config
 */
export async function addTsLibrary(config: AddConfiguration): Promise<void> {
    await new AddTsLibraryCommand(config).run();
}