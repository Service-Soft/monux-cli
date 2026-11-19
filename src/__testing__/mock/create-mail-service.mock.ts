import { FsUtilities, Path, PathUtilities } from '../../encapsulation';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function createMailServiceMock(root: string): Promise<void> {
    const servicePath: Path = PathUtilities.resolve(root, 'src', 'services', 'mail.service.ts');
    await FsUtilities.createFile(servicePath, []);
}