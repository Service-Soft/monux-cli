import { AddTsLibraryCommand } from './add-ts-library.command';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Adds a ts library to a monorepo.
 * @param config - The configuration for the creation.
 */
export async function addTsLibrary(config: AddConfiguration): Promise<void> {
    await new AddTsLibraryCommand(config).run();
}