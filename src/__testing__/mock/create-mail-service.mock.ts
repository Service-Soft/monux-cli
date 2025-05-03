import { FsUtilities } from '../../encapsulation';
import { Path, getPath } from '../../utilities';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function createMailServiceMock(root: string): Promise<void> {
    const servicePath: Path = getPath(root, 'src', 'services', 'mail.service.ts');
    await FsUtilities.createFile(servicePath, []);
}